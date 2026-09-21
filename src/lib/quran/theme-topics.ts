export type Topic = {
  id: string;
  name: string;
  arabic: string;
  description: string;
  verses: string[];
  keywords: string[];
};

export const TOPICS: Topic[] = [
  {
    id: "iman",
    name: "Faith (Iman)",
    arabic: "إيمان",
    description: "Belief, tawhid, and the unseen",
    verses: ["2:285", "4:136", "49:14", "8:2", "57:16", "2:3"],
    keywords: ["believe", "faith", "believer", "unseen"],
  },
  {
    id: "salah",
    name: "Prayer (Salah)",
    arabic: "صلاة",
    description: "Worship, prayer times, and remembrance",
    verses: ["2:3", "2:238", "11:114", "17:78", "29:45", "20:14"],
    keywords: ["prayer", "salah", "worship", "bow"],
  },
  {
    id: "prophets",
    name: "Prophets",
    arabic: "أنبياء",
    description: "Stories of the messengers",
    verses: ["2:136", "6:84", "19:16", "21:107", "33:40", "12:4"],
    keywords: ["prophet", "messenger", "musa", "isa", "ibrahim", "nuh"],
  },
  {
    id: "mercy",
    name: "Mercy",
    arabic: "رحمة",
    description: "Compassion, forgiveness, and rahma",
    verses: ["1:1", "1:3", "6:12", "7:156", "21:107", "55:1"],
    keywords: ["mercy", "compassionate", "forgiving", "rahma"],
  },
  {
    id: "justice",
    name: "Justice",
    arabic: "عدل",
    description: "Fairness, trusts, and standing for truth",
    verses: ["4:135", "5:8", "16:90", "55:7", "49:9"],
    keywords: ["justice", "oppress", "balance", "trust"],
  },
  {
    id: "patience",
    name: "Patience",
    arabic: "صبر",
    description: "Sabr in hardship and waiting on God",
    verses: ["2:153", "2:155", "16:126", "94:5", "103:3"],
    keywords: ["patience", "sabr", "persevere"],
  },
  {
    id: "charity",
    name: "Charity",
    arabic: "زكاة",
    description: "Zakat, spending, and care for the poor",
    verses: ["2:43", "2:261", "9:60", "76:8", "107:3"],
    keywords: ["charity", "zakat", "poor", "spend"],
  },
  {
    id: "knowledge",
    name: "Knowledge",
    arabic: "علم",
    description: "The Book, wisdom, and seeking to know",
    verses: ["96:1", "20:114", "58:11", "39:9", "2:269"],
    keywords: ["knowledge", "wisdom", "book", "read"],
  },
  {
    id: "afterlife",
    name: "Afterlife",
    arabic: "آخرة",
    description: "The Last Day, garden, and fire",
    verses: ["2:4", "3:185", "99:7", "101:6", "56:10"],
    keywords: ["hereafter", "paradise", "hell", "resurrection"],
  },
  {
    id: "family",
    name: "Family",
    arabic: "أسرة",
    description: "Parents, orphans, and kinship",
    verses: ["17:23", "31:14", "4:36", "2:83", "46:15"],
    keywords: ["parent", "mother", "father", "orphan", "kin"],
  },
  {
    id: "gratitude",
    name: "Gratitude",
    arabic: "شكر",
    description: "Shukr and remembering favors",
    verses: ["2:152", "14:7", "16:18", "31:12", "55:13"],
    keywords: ["grateful", "thank", "favor", "blessing"],
  },
  {
    id: "guidance",
    name: "Guidance",
    arabic: "هدى",
    description: "The straight path and the Book as guide",
    verses: ["1:6", "2:2", "2:185", "17:9", "27:2"],
    keywords: ["guidance", "path", "straight", "guide"],
  },
];

export function topicById(id: string) {
  return TOPICS.find((topic) => topic.id === id);
}
