export type DemoNewsPost = {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  body: string[];
  author: string;
  publishedAt: string;
  readMinutes: number;
};

export const DEMO_NEWS_POSTS: DemoNewsPost[] = [
  {
    id: "sales-playbook-q3",
    title: "Cap nhat Sales Playbook Q3 cho doi bao gia",
    category: "Sales Ops",
    excerpt:
      "Mau bao gia moi, quy trinh phe duyet giam gia va checklist chot deal da duoc cap nhat tren he thong.",
    body: [
      "Tuan nay bo phan Sales Operations da phat hanh Sales Playbook Q3. Ban cap nhat tap trung vao 3 diem: rut ngan thoi gian tao bao gia, giam so lan sua ban nhap va chuan hoa thong tin scope.",
      "Tat ca account manager can su dung mau bao gia moi tren module Quotations. Doi voi deal co discount, vui long dien ro discount reason de quy trinh phe duyet duoc xu ly nhanh hon.",
      "Team lead can review 5 bao gia dau tien cua moi ban trong tuan de dam bao format thong nhat truoc khi gui khach hang.",
    ],
    author: "Phuong Anh - Sales Ops Lead",
    publishedAt: "2026-05-09T07:30:00.000Z",
    readMinutes: 4,
  },
  {
    id: "training-onboarding-60-days",
    title: "Chuong trinh onboarding 60 ngay cho nhan su moi",
    category: "People & Training",
    excerpt:
      "Kho hoc onboarding duoc tach thanh 3 giai doan de giup nhan su moi vao viec nhanh, ro trach nhiem va co mentor dong hanh.",
    body: [
      "Chuong trinh onboarding moi da duoc ban hanh trong module Training, gom 3 phase: Nen tang (ngay 1-14), Thuc chien (ngay 15-40) va Tu chu (ngay 41-60).",
      "Moi hoc vien duoc gan assignment theo phong ban. Mentor can check-in toi thieu 2 lan/tuan va cap nhat nhan xet vao phan ghi chu assignment.",
      "Muc tieu la den ngay thu 60, nhan su moi co the tu tao bao gia, hieu quy trinh tai lieu/chinh sach va lam viec doc lap voi dashboard KPI ca nhan.",
    ],
    author: "Minh Chau - HRBP",
    publishedAt: "2026-05-08T03:15:00.000Z",
    readMinutes: 5,
  },
  {
    id: "policy-security-refresh",
    title: "Dot nhac lai chinh sach bao mat du lieu noi bo",
    category: "Compliance",
    excerpt:
      "Bo phan Compliance da phat hanh ban nhac lai ve viec xu ly tai lieu nhay cam, quyen truy cap va quy trinh bao cao su co.",
    body: [
      "Tu thang nay, moi tai lieu danh dau sensitive bat buoc phai truy cap thong qua endpoint bao mat trong module Documents. Khong trao doi file qua kenh ca nhan neu khong co phe duyet.",
      "Doi ngu can hoan tat acknowledgement cho Policy version moi nhat trong vong 3 ngay lam viec. He thong da bat thong bao tu dong va nhac lai theo role.",
      "Neu phat hien truy cap bat thuong, vui long tao incident ticket trong 15 phut dau tien va thong bao Security Champion cua bo phan.",
    ],
    author: "Bao Khang - Compliance Manager",
    publishedAt: "2026-05-07T10:00:00.000Z",
    readMinutes: 3,
  },
];
