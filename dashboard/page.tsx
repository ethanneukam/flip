'use client';
import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Fallback to empty strings if env is missing so it doesn't crash the build
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function DebugDashboard() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testFetch() {
      try {
        if (!supabaseUrl) {
           setError("MISSING_ENV_VARS: Check your .env.local file!");
           setLoading(false);
           return;
        }

        const { data: result, error: sbError } = await supabase
          .from('api_keys')
          .select('*')
          .eq('key_value', 'FLIP_DEV_TEST_123')
          .single();

        if (sbError) {
          setError(sbError.message);
        } else {
          setData(result);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    testFetch();
  }, []);

  if (loading) return <div style={{color: '#e8ff47', background: 'black', height: '100vh', padding: '20px'}}>SYSTEM_CHECK_IN_PROGRESS...</div>;
  
  if (error) return (
    <div style={{color: 'red', background: 'black', height: '100vh', padding: '20px'}}>
      <h1>CRITICAL_ERROR</h1>
      <pre>{error}</pre>
      <p>Tip: Ensure you have a table named 'api_keys' with a column 'key_value'</p>
    </div>
  );

  return (
    <div style={{color: 'white', background: '#050505', minHeight: '100vh', padding: '40px', fontFamily: 'monospace'}}>
      <h1 style={{borderBottom: '1px solid #333', paddingBottom: '10px'}}>TERMINAL_DASHBOARD</h1>
      <div style={{marginTop: '20px', border: '1px solid #e8ff47', padding: '20px'}}>
        <p><strong>ENTITY:</strong> {data?.company_name}</p>
        <p><strong>KEY:</strong> {data?.key_value}</p>
        <p><strong>USAGE:</strong> {data?.request_count} / 10,000</p>
      </div>
      <p style={{fontSize: '10px', color: '#666', marginTop: '20px'}}>READY_FOR_UPGRADE_TO_UI_V2</p>
    </div>
  );
}