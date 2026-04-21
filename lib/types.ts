export type Store = "Amazon" | "Target" | "IKEA";

export interface ColorSwatch {
  name: string;
  hex: string;
}

export interface Placement {
  x: number;
  y: number;
  note: string;
}

export interface DesignItem {
  name: string;
  description: string;
  price: number;
  store: Store;
  searchQuery: string;
  emoji: string;
  placement: Placement;
}

export interface DesignResponse {
  vibeName: string;
  tagline: string;
  description: string;
  moodWords: string[];
  colorPalette: ColorSwatch[];
  changesNeeded: string[];
  imagePrompt: string;
  items: DesignItem[];
}

export interface DesignApiRequest {
  image: string;
  vibe: string;
  budget: number;
}

export interface RenderApiRequest {
  image: string;
  imagePrompt: string;
}

export interface RenderApiResponse {
  imageBase64: string;
}
