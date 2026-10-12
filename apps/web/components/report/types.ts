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
  /* video scans only */
  video_url?: string | null;
  video_url_type?: "direct" | "stream" | "embed" | null;
  category?: "possible" | "strong" | "verified" | null;
  matched_frame_time?: number | null;
  frames_matched?: number;
  matched_segment?: { start: number; end: number } | null;
  evidence?: VideoEvidenceData | null;
}

export interface VideoEvidenceData {
  thumbnail_match: boolean;
  frames_matched: number;
  video_url_found: boolean;
  video_url_type?: string | null;
  verification: "verified" | "partial" | "no_frame_match" | "not_verified" | "not_attempted";
  verification_reason?: string | null;
  frames_checked?: number;
  matched_frames?: number;
  ordered_frames?: number | null;
  seconds_checked?: number | null;
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
  input_type?: "image" | "video";
  reference_frames?: number;
  video_info?: { duration_seconds: number; width: number; height: number; keyframe_times: number[] } | null;
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