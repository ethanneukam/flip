export type ItemCondition = 'mint' | 'excellent' | 'good' | 'fair' | 'poor';
export type ItemStatus = 'draft' | 'listed' | 'sold' | 'archived';
export type ListingStatus = 'active' | 'pending' | 'sold' | 'cancelled';
export type MarketVelocity = 'fast' | 'medium' | 'slow' | 'stagnant';
export type TrendDirection = 'up' | 'down' | 'stable';
export type PredictionType = 'price_up' | 'price_down' | 'overvalued' | 'undervalued';
export type PredictionStatus = 'pending' | 'resolved' | 'expired';
export type PredictionOutcome = 'correct' | 'incorrect' | 'inconclusive';
export type ConfidenceReason = 'sufficient_history' | 'category_baseline' | 'ai_estimate_only';
export type RankTier = 'Rookie' | 'Analyst' | 'Forecaster' | 'Oracle';
export type PortfolioStatus = 'holding' | 'sold' | 'watchlist';
export type NotificationEventType =
  | 'PRICE_SPIKE'
  | 'PRICE_DROP'
  | 'DEMAND_SURGE'
  | 'PORTFOLIO_GAIN'
  | 'PORTFOLIO_LOSS'
  | 'RANK_UP'
  | 'PREDICTION_RESOLVED';

export type NotificationPrefs = {
  PRICE_SPIKE: boolean;
  PRICE_DROP: boolean;
  DEMAND_SURGE: boolean;
  PORTFOLIO_GAIN: boolean;
  PORTFOLIO_LOSS: boolean;
  RANK_UP: boolean;
  PREDICTION_RESOLVED: boolean;
};

export type FlipItem = {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  brand?: string;
  model?: string;
  condition: ItemCondition;
  aiConfidence: number;
  imageUrls: string[];
  status: ItemStatus;
  marketSignal?: MarketSignal;
  createdAt: string;
};

export type MarketSignal = {
  id: string;
  flipItemId: string;
  avgPrice: number;
  lowPrice: number;
  highPrice: number;
  recommendedPrice: number;
  demandScore: number;
  supplyScore: number;
  liquidityScore: number;
  flipScore: number;
  velocity: MarketVelocity;
  trendDirection: TrendDirection;
  trendPercent: number;
  dataSources: string[];
  lowConfidence: boolean;
  confidenceReason: ConfidenceReason;
  dataPointsUsed: number;
  generatedAt: string;
  expiresAt: string;
};

export type Listing = {
  id: string;
  flipItemId: string;
  userId: string;
  askingPrice: number;
  finalPrice?: number;
  platform: string;
  status: ListingStatus;
  views: number;
  offers: number;
  listedAt: string;
  soldAt?: string;
  expiresAt?: string;
};

export type User = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  repScore: number;
  totalFlips: number;
  verified: boolean;
  isPro: boolean;
  dailyScanCount: number;
  scanLimit: number;
  expoPushToken?: string;
  notificationPrefs: NotificationPrefs;
  createdAt: string;
};

export type Prediction = {
  id: string;
  userId: string;
  flipItemId: string;
  predictionType: PredictionType;
  entryPrice: number;
  targetPrice?: number;
  horizonDays: number;
  status: PredictionStatus;
  resolvedPrice?: number;
  outcome?: PredictionOutcome;
  accuracyDelta?: number;
  createdAt: string;
  resolvesAt: string;
  resolvedAt?: string;
};

export type PortfolioEntry = {
  id: string;
  userId: string;
  flipItemId: string;
  costBasis: number;
  estimatedValue: number;
  status: PortfolioStatus;
  addedAt: string;
};

export type WatchlistItem = {
  id: string;
  userId: string;
  flipItemId: string;
  addedAt: string;
};

export type Notification = {
  id: string;
  userId: string;
  eventType: NotificationEventType;
  flipItemId?: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export type NotificationQueueItem = {
  id: string;
  userId: string;
  eventType: NotificationEventType;
  flipItemId?: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  createdAt: string;
  processedAt?: string;
};

export type SignalRetryQueueItem = {
  id: string;
  flipItemId: string;
  status: 'pending' | 'processing' | 'failed';
  attempts: number;
  lastError?: string;
  createdAt: string;
  lastAttemptAt?: string;
};

export type Recommendation = 'SELL' | 'BUY' | 'HOLD';
