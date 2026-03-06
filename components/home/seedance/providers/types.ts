import type { GenerationMode, VideoInputPayload } from "@/config/model_config";

export type ShotItem = {
  Scene: string;
  duration: number;
};

export type ProviderFormValues = {
  prompt?: string;
  imageUrl?: string;
  endImageUrl?: string;
  resolution?: string;
  duration?: string;
  aspectRatio?: string;
  size?: string;
  seed?: string;
  cameraFixed?: boolean;
  enableSafetyChecker?: boolean;
  shots?: ShotItem[];
  watermark?: string;
  enableTranslation?: boolean;
};

export type ProviderFieldsProps = {
  values: ProviderFormValues;
  onChange: (next: Partial<ProviderFormValues>) => void;
  isPublic: boolean;
  onPublicChange: (next: boolean) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  mode: GenerationMode;
};

export type ProviderComponent = React.ComponentType<ProviderFieldsProps>;

export type ProviderMeta = {
  getDefaultValues: () => ProviderFormValues;
  buildPayload: (values: ProviderFormValues) => VideoInputPayload;
  requiresImage?: boolean;
  requiresPrompt?: boolean;
};
