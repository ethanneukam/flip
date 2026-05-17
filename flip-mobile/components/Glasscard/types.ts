import type { GlasscardData } from '../../types/models';

export type GlasscardMode = 'full' | 'feed';

export type GlasscardProps = {
  data: GlasscardData;
  onBuy?: () => void;
  onWatch?: () => void;
  onInspectSeller?: () => void;
  onReject?: () => void;
  mode?: GlasscardMode;
  isMarketLoading?: boolean;
};
