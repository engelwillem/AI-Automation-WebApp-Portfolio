
import { CommunityPost, CommunityComment } from "./types";

export const MOCK_USERS = {
  me: { id: "me", name: "The Chosen User", avatarUrl: "https://picsum.photos/seed/me/100/100" },
  sarah: { id: "u1", name: "Sarah Miller", avatarUrl: "https://picsum.photos/seed/u1/100/100" },
  david: { id: "u2", name: "David Chen", avatarUrl: "https://picsum.photos/seed/u2/100/100" },
  anna: { id: "u3", name: "Anna Grace", avatarUrl: "https://picsum.photos/seed/u3/100/100" },
};

export const MOCK_POSTS: CommunityPost[] = [
  {
    id: "p1",
    type: "member_post",
    type_label: "Post",
    text: "Bagaimana cara kalian menjaga konsistensi doa di pagi hari? Saya merasa 5 menit pertama sangat menentukan seluruh hari saya. 🙏",
    createdAt: "2 jam yang lalu",
    author: MOCK_USERS.sarah,
    counts: { likes: 342, comments: 24, bookmarks: 12 },
    isLiked: false,
    isBookmarked: true,
  },
  {
    id: "p2",
    type: "member_post",
    type_label: "Post",
    text: "Pemandangan pagi ini luar biasa indahnya. Pengingat akan kebesaran Sang Pencipta.",
    imageUrl: "https://picsum.photos/seed/post2/800/450",
    createdAt: "4 jam yang lalu",
    author: MOCK_USERS.david,
    counts: { likes: 120, comments: 5, bookmarks: 8 },
    isLiked: true,
    isBookmarked: false,
  },
  {
    id: "p3",
    type: "member_post",
    type_label: "Post",
    text: "Ayat hari ini: 'Janganlah hendaknya kamu kuatir tentang apapun juga...' (Filipi 4:6). Sangat relevan buat saya minggu ini.",
    createdAt: "6 jam yang lalu",
    author: MOCK_USERS.anna,
    counts: { likes: 89, comments: 15, bookmarks: 45 },
    isLiked: false,
    isBookmarked: false,
  },
  {
    id: "p4",
    type: "member_post",
    type_label: "Post",
    text: "",
    imageUrl: "https://picsum.photos/seed/post4/800/800",
    createdAt: "8 jam yang lalu",
    author: MOCK_USERS.sarah,
    counts: { likes: 230, comments: 42, bookmarks: 10 },
    isLiked: true,
    isBookmarked: false,
  },
  {
    id: "p5",
    type: "member_post",
    type_label: "Post",
    text: "Sangat bersyukur bisa berkumpul kembali dengan komunitas Bible Study minggu ini. Energi yang sangat positif! 🌟",
    createdAt: "Kemarin",
    author: MOCK_USERS.david,
    counts: { likes: 45, comments: 2, bookmarks: 1 },
    isLiked: false,
    isBookmarked: false,
  },
  {
    id: "p6",
    type: "member_post",
    type_label: "Post",
    text: "Terkadang kita perlu diam untuk mendengar suara hati. Jangan lupa luangkan waktu sejenak hari ini untuk refleksi diri.",
    imageUrl: "https://picsum.photos/seed/post6/800/400",
    createdAt: "Kemarin",
    author: MOCK_USERS.anna,
    counts: { likes: 567, comments: 89, bookmarks: 120 },
    isLiked: true,
    isBookmarked: true,
  },
];

export const MOCK_COMMENTS: CommunityComment[] = [
  { id: "c1", postId: "p1", text: "Setuju banget! Saya juga mulai dengan 5 menit bersyukur.", createdAt: "1 jam lalu", author: MOCK_USERS.david },
  { id: "c2", postId: "p1", text: "Saya pakai aplikasi reminder supaya nggak lupa.", createdAt: "30 menit lalu", author: MOCK_USERS.anna },
  { id: "c3", postId: "p2", text: "Lokasinya di mana kak? Keren banget!", createdAt: "2 jam lalu", author: MOCK_USERS.sarah },
  { id: "c4", postId: "p3", text: "Terima kasih sudah share, sangat menguatkan.", createdAt: "1 jam lalu", author: MOCK_USERS.me },
];
