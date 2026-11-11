import { SURAH_VERSE_COUNTS } from "@/lib/reading";

export type SurahName = {
  id: number;
  name: string;
  /** Lowercase aliases, including multi-word transliterations. */
  aliases: string[];
};

/** id|Display name|alias|alias — aliases are matched as whole words. */
const RAW = `
1|Al-Fatihah|fatiha|fatihah|alfatiha|alfatihah|al fatiha|al fatihah|the opening|the opener
2|Al-Baqarah|baqara|baqarah|baqra|bakara|albaqara|al baqara|al baqarah|the cow
3|Ali 'Imran|imran|alimran|ali imran|aliimran|family of imran
4|An-Nisa|nisa|nisaa|annisa|al nisa|an nisa
5|Al-Ma'idah|maidah|maida|al maidah|al maidah|the table
6|Al-An'am|anam|anaam|alanam|al anam|the cattle
7|Al-A'raf|araf|aaraf|al araf|al araf|the heights
8|Al-Anfal|anfal|al anfal|the spoils
9|At-Tawbah|tawba|tawbah|at tawbah|attawbah|repentance|baraah|baraat
10|Yunus|yunus|yoonus|jonas
11|Hud|hud
12|Yusuf|yusuf|yousuf|yusef|joseph
13|Ar-Ra'd|rad|raad|ar rad|thunder
14|Ibrahim|ibrahim|ibraheem|ibrahim|abraham
15|Al-Hijr|hijr|al hijr
16|An-Nahl|nahl|an nahl|the bee
17|Al-Isra|isra|israa|al isra|bani israel|the night journey
18|Al-Kahf|kahf|kahaf|al kahf|the cave
19|Maryam|maryam|mary
20|Ta-Ha|taha|ta ha|tahaa
21|Al-Anbya|anbiya|anbiyaa|al anbiya|the prophets
22|Al-Hajj|hajj|haj|al hajj|the pilgrimage
23|Al-Mu'minun|muminun|muminoon|al muminun|the believers
24|An-Nur|nur|noor|an nur|an noor
25|Al-Furqan|furqan|furqaan|al furqan|the criterion
26|Ash-Shu'ara|shuara|shuaraa|ash shuara|the poets
27|An-Naml|naml|an naml|the ant
28|Al-Qasas|qasas|al qasas|the stories
29|Al-'Ankabut|ankabut|ankabout|al ankabut|the spider
30|Ar-Rum|rum|ar rum|ar room|the romans
31|Luqman|luqman|luqmaan|lokman
32|As-Sajdah|sajda|sajdah|as sajdah|prostration
33|Al-Ahzab|ahzab|al ahzab|the confederates
34|Saba|saba|sheba
35|Fatir|fatir|al fatir|the originator
36|Ya-Sin|yasin|yaseen|yassin|ya sin|ya seen
37|As-Saffat|saffat|as saffat
38|Sad|sad|saad
39|Az-Zumar|zumar|az zumar|the groups
40|Ghafir|ghafir|ghafar|the forgiver
41|Fussilat|fussilat|fussilat|ha mim sajdah
42|Ash-Shura|shura|ash shura|consultation
43|Az-Zukhruf|zukhruf|az zukhruf|gold ornaments
44|Ad-Dukhan|dukhan|dukhaan|ad dukhan|the smoke
45|Al-Jathiyah|jathiya|jathiyah|al jathiyah|kneeling
46|Al-Ahqaf|ahqaf|al ahqaf
47|Muhammad|muhammad|mohammad|mohammed|mohamed
48|Al-Fath|fath|al fath|conquest
49|Al-Hujurat|hujurat|al hujurat|the chambers
50|Qaf|qaf|qaaf
51|Adh-Dhariyat|dhariyat|zariyat|ad dhariyat
52|At-Tur|tur|at tur|the mount
53|An-Najm|najm|an najm|the star
54|Al-Qamar|qamar|al qamar|the moon
55|Ar-Rahman|rahman|rehman|ar rahman|ar rehman
56|Al-Waqi'ah|waqiah|waqia|al waqiah|the inevitable
57|Al-Hadid|hadid|hadeed|al hadid
58|Al-Mujadila|mujadila|mujadilah|mujadalah|al mujadila
59|Al-Hashr|hashr|al hashr|exile
60|Al-Mumtahanah|mumtahana|mumtahanah|mumtahina|al mumtahanah
61|As-Saf|saf|as saf
62|Al-Jumu'ah|jumuah|jumua|juma|jumma|al jumuah|friday
63|Al-Munafiqun|munafiqun|munafiqoon|al munafiqun|the hypocrites
64|At-Taghabun|taghabun|at taghabun
65|At-Talaq|talaq|talaaq|at talaq|divorce
66|At-Tahrim|tahrim|tahreem|at tahrim
67|Al-Mulk|mulk|al mulk|dominion|the kingdom
68|Al-Qalam|qalam|al qalam|the pen
69|Al-Haqqah|haqqah|haqqa|al haqqah
70|Al-Ma'arij|maarij|maarij|al maarij
71|Nuh|nuh|nooh|noah
72|Al-Jinn|jinn|al jinn
73|Al-Muzzammil|muzzammil|muzammil|al muzzammil
74|Al-Muddaththir|muddaththir|muddathir|mudaththir|al muddaththir
75|Al-Qiyamah|qiyama|qiyamah|qiyamat|al qiyamah|resurrection
76|Al-Insan|insan|al insan|dahr
77|Al-Mursalat|mursalat|al mursalat
78|An-Naba|naba|an naba|the tidings
79|An-Nazi'at|naziat|an naziat
80|Abasa|abasa
81|At-Takwir|takwir|at takwir
82|Al-Infitar|infitar|al infitar
83|Al-Mutaffifin|mutaffifin|mutaffifeen|al mutaffifin
84|Al-Inshiqaq|inshiqaq|al inshiqaq
85|Al-Buruj|buruj|burooj|al buruj
86|At-Tariq|tariq|taariq|at tariq
87|Al-A'la|ala|aala|al ala|the most high
88|Al-Ghashiyah|ghashiya|ghashiyah|ghashia|al ghashiyah
89|Al-Fajr|fajr|al fajr|the dawn
90|Al-Balad|balad|al balad|the city
91|Ash-Shams|shams|ash shams|the sun
92|Al-Layl|layl|lail|al layl|the night
93|Ad-Duhaa|duha|dhuha|duhaa|ad duha|the morning
94|Ash-Sharh|sharh|inshirah|ash sharh|the expansion
95|At-Tin|tin|at tin|the fig
96|Al-'Alaq|alaq|al alaq|iqra|the clot
97|Al-Qadr|qadr|al qadr|the decree
98|Al-Bayyinah|bayyina|bayyinah|al bayyinah
99|Az-Zalzalah|zalzala|zalzalah|zilzal|az zalzalah|the earthquake
100|Al-'Adiyat|adiyat|al adiyat
101|Al-Qari'ah|qariah|qaria|al qariah
102|At-Takathur|takathur|at takathur
103|Al-'Asr|asr|al asr|the afternoon
104|Al-Humazah|humaza|humazah|al humazah
105|Al-Fil|fil|feel|al fil|the elephant
106|Quraysh|quraysh|quraish|quraysh
107|Al-Ma'un|maun|maoon|al maun
108|Al-Kawthar|kawthar|kauthar|al kawthar
109|Al-Kafirun|kafirun|kafiroon|al kafirun
110|An-Nasr|nasr|an nasr
111|Al-Masad|masad|lahab|tabbat|al masad
112|Al-Ikhlas|ikhlas|ikhlaas|al ikhlas|sincerity
113|Al-Falaq|falaq|al falaq|daybreak
114|An-Nas|nas|an nas|mankind
`;

function parseCatalog(raw: string): SurahName[] {
  return raw
    .trim()
    .split("\n")
    .map((line) => {
      const [id, name, ...aliases] = line.split("|");
      return {
        id: Number(id),
        name: name ?? "",
        aliases: [...new Set(aliases.map((alias) => alias.trim()).filter(Boolean))],
      };
    });
}

export const SURAH_NAMES: SurahName[] = parseCatalog(RAW);

const BY_ID = new Map(SURAH_NAMES.map((surah) => [surah.id, surah]));

export function surahById(id: number) {
  return BY_ID.get(id) ?? null;
}

export function surahVerseCount(id: number) {
  return SURAH_VERSE_COUNTS[id - 1] ?? 0;
}

export function surahAliasTokens() {
  const tokens = new Set<string>();
  for (const surah of SURAH_NAMES) {
    for (const alias of surah.aliases) {
      for (const part of alias.split(" ")) {
        if (part.length >= 5) tokens.add(part);
      }
    }
  }
  return tokens;
}
