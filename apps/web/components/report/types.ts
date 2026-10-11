export interface CaseData {
  case_id: string;
  created_at: number;
  anonymous: boolean;
  platform_source: string;
  issue_type: string;
  description?: string | null;
  pipeline_type?: "ncii" | string | null;
}

export interface DiscoveryMatch {
  domain: string;
  network?: string | null;
  provider_type?: string | null;
  page_url: string;
  image_url: string;
  asset_type: string;
  confidence: number;
  match_type: "exact" | "near_duplicate" | "structural" | "probable";
  phash_distance: number;
  dhash_distance: number;
  ahash_distance: number;
  ssim_score: number;
  keypoint_matches?: number;
  keypoint_match_rate?: number;
  match_method?: "hash" | "geometric" | "orb_fallback";
  matched_variant?: string | null;
  alt_image_urls?: string[];
  page_specific?: boolean;
}

export interface DiscoveryRelatedDomain {
  domain: string;
  network: string;
  provider_type?: string | null;
  reason: string;
}

export interface DiscoveryEvent {
  timestamp: number;
  type: "domain" | "page" | "asset" | "match" | "info" | "error";
  message: string;
  domain?: string | null;
  page_url?: string | null;
  asset_url?: string | null;
  asset_type?: string | null;
  preview_url?: string | null;
  match_type?: string | null;
  confidence?: number | null;
}

export interface DiscoveryResult {
  case_id: string;
  status: "queued" | "running" | "completed" | "failed";
  started_at: number;
  finished_at?: number | null;
  prioritized_network?: string | null;
  target_domains: string[];
  current_domain?: string | null;
  current_page?: string | null;
  current_asset?: string | null;
  domains_scanned: number;
  domains_with_matches?: number;
  domain_status?: Record<string, "checked" | "no_images" | "blocked" | "unreachable" | "skipped">;
  coverage?: { checked?: number; no_images?: number; blocked?: number; unreachable?: number; skipped?: number };
  truncated?: boolean;
  truncation_reason?: string | null;
  evidence?: { sha256: string; size_bytes: number; ela_flagged?: boolean } | null;
  pages_scanned: number;
  candidates_evaluated: number;
  direct_matches: DiscoveryMatch[];
  related_domains: DiscoveryRelatedDomain[];
  recent_events: DiscoveryEvent[];
  error?: string | null;
}