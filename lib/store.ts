import type { Store } from "./types";

export function storeUrl(store: Store, query: string): string {
  const q = encodeURIComponent(query);
  switch (store) {
    case "Amazon":
      return `https://www.amazon.com/s?k=${q}`;
    case "Target":
      return `https://www.target.com/s?searchTerm=${q}`;
    case "IKEA":
      return `https://www.ikea.com/us/en/search/?q=${q}`;
  }
}

export function storePillClass(store: Store): string {
  switch (store) {
    case "Amazon":
      return "store-pill store-amazon";
    case "Target":
      return "store-pill store-target";
    case "IKEA":
      return "store-pill store-ikea";
  }
}
