import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 50;

type NotificationPrefs = {
  PRICE_SPIKE: boolean;
  PRICE_DROP: boolean;
  DEMAND_SURGE: boolean;
  PORTFOLIO_GAIN: boolean;
  PORTFOLIO_LOSS: boolean;
  RANK_UP: boolean;
  PREDICTION_RESOLVED: boolean;
};

type QueueItem = {
  id: string;
  user_id: string;
  event_type: string;
  flip_item_id: string | null;
  payload: Record<string, unknown>;
  attempts: number;
};

function buildNotificationPayload(
  eventType: string,
  context: Record<string, unknown>
): { title: string; message: string } {
  const map: Record<string, { title: string; message: string }> = {
    PRICE_SPIKE: {
      title: `Price surged +${context.pctChange}%`,
      message: `Watched item moved from $${context.oldPrice} → $${context.newPrice}`,
    },
    PRICE_DROP: {
      title: `Price dropped ${context.pctChange}%`,
      message: `Watchlisted item fell to $${context.newPrice}`,
    },
    DEMAND_SURGE: {
      title: 'Demand spike detected',
      message: `Demand score hit ${context.newDemandScore}`,
    },
    RANK_UP: {
      title: `You're now ${context.newRank}`,
      message: 'Prediction accuracy earned a rank upgrade',
    },
    PREDICTION_RESOLVED: {
      title: context.outcome === 'correct' ? 'Prediction correct' : 'Prediction missed',
      message: `Item moved ${context.pctChange}% over ${context.horizonDays} days`,
    },
    PORTFOLIO_GAIN: {
      title: `Portfolio up ${context.pctChange}%`,
      message: `Estimated value increased to $${context.newValue}`,
    },
    PORTFOLIO_LOSS: {
      title: `Portfolio down ${context.pctChange}%`,
      message: `Estimated value dropped to $${context.newValue}`,
    },
  };

  return map[eventType] ?? { title: 'Market update', message: 'A signal changed on a watched item' };
}

async function sendExpoPush(
  pushToken: string,
  title: string,
  message: string
): Promise<boolean> {
  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: pushToken,
        title,
        body: message,
        sound: 'default',
      }),
    });

    if (!response.ok) return false;

    const result = await response.json();
    // Expo returns { data: { status: 'ok' } } on success
    return result?.data?.status === 'ok';
  } catch {
    return false;
  }
}

serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${SERVICE_ROLE_KEY}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Fetch pending queue items (oldest first, limited batch)
    const { data: queueItems, error: fetchError } = await supabase
      .from('notification_queue')
      .select('id, user_id, event_type, flip_item_id, payload, attempts')
      .eq('status', 'pending')
      .lt('attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch queue', detail: fetchError.message }),
        { status: 500 }
      );
    }

    if (!queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), { status: 200 });
    }

    // Get unique user_ids to batch-fetch user data
    const userIds = Array.from(new Set(queueItems.map((q: QueueItem) => q.user_id)));

    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, expo_push_token, notification_prefs')
      .in('id', userIds);

    if (userError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users', detail: userError.message }),
        { status: 500 }
      );
    }

    const userMap = new Map<string, { expo_push_token: string | null; notification_prefs: NotificationPrefs }>();
    if (users) {
      for (const u of users) {
        userMap.set(u.id, {
          expo_push_token: u.expo_push_token,
          notification_prefs: u.notification_prefs as NotificationPrefs,
        });
      }
    }

    let sent = 0;
    let failed = 0;
    let skippedPush = 0;

    for (const item of queueItems as QueueItem[]) {
      const user = userMap.get(item.user_id);
      if (!user) {
        // User not found — mark as failed
        await supabase
          .from('notification_queue')
          .update({ status: 'failed', processed_at: new Date().toISOString() })
          .eq('id', item.id);
        failed++;
        continue;
      }

      const { title, message } = buildNotificationPayload(item.event_type, item.payload);

      // Always write to notifications inbox (regardless of push pref)
      await supabase.from('notifications').insert({
        user_id: item.user_id,
        event_type: item.event_type,
        flip_item_id: item.flip_item_id,
        title,
        message,
      });

      // Check user notification preferences for this event type
      const prefKey = item.event_type as keyof NotificationPrefs;
      const pushEnabled = user.notification_prefs?.[prefKey] !== false;
      const hasToken = !!user.expo_push_token;

      if (pushEnabled && hasToken) {
        const pushSuccess = await sendExpoPush(user.expo_push_token!, title, message);

        if (pushSuccess) {
          await supabase
            .from('notification_queue')
            .update({ status: 'sent', processed_at: new Date().toISOString() })
            .eq('id', item.id);
          sent++;
        } else {
          const newAttempts = item.attempts + 1;
          const newStatus = newAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending';
          await supabase
            .from('notification_queue')
            .update({ attempts: newAttempts, status: newStatus, processed_at: new Date().toISOString() })
            .eq('id', item.id);
          failed++;
        }
      } else {
        // Push disabled or no token — mark as sent (inbox delivery is complete)
        await supabase
          .from('notification_queue')
          .update({ status: 'sent', processed_at: new Date().toISOString() })
          .eq('id', item.id);
        skippedPush++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: queueItems.length, sent, failed, skippedPush }),
      { status: 200 }
    );

  } catch (err) {
    console.error('process-notification-queue error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error', detail: String(err) }),
      { status: 500 }
    );
  }
});
