/**
 * Ảnh minh họa nội thất (Unsplash) — có thể thay bằng ảnh dự án thật trong /public hoặc CMS sau này.
 * Kích thước query phù hợp next/image và CDN Unsplash.
 */
const q = "w=1600&q=85&auto=format&fit=crop";

export const SHOWCASE_HERO = {
  src: `https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?${q}`,
  alt: "Phòng khách hiện đại, ánh sáng tự nhiên và đồ nội thất tối giản",
};

export const SHOWCASE_GRID = [
  {
    src: `https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?${q}`,
    alt: "Không gian sống ấm áp với sofa và thảm",
    label: "Không gian sống",
  },
  {
    src: `https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?${q}`,
    alt: "Bếp và quầy bar nội thất gỗ",
    label: "Bếp & pantry",
  },
  {
    src: `https://images.unsplash.com/photo-1497366216548-375260702973?${q}`,
    alt: "Văn phòng làm việc với ánh sáng và cây xanh",
    label: "Workspace",
  },
  {
    src: `https://images.unsplash.com/photo-1583847268004-bf45d0926b45?${q}`,
    alt: "Phòng tắm spa và gạch men cao cấp",
    label: "Spa & phòng tắm",
  },
] as const;

export const LOGIN_SIDE_IMAGE = {
  src: `https://images.unsplash.com/photo-1600585154340-be6161a56a0c?${q}`,
  alt: "Nội thất sang trọng — minh họa thương hiệu GOMITA",
};
