/** Text and images for the Home page, in page order. */
import { CHECK_IN, HOUSE_RULES, LANDMARKS, DIRECTIONS, OCCUPANCY } from "./site";

export const HERO = {
  image: {
    src: "/media/canada4-compressed-400kb.jpg",
    alt: "Lakeview wooden cabin lit up on a forested cliff above Howe Sound at dusk",
  },
  /** Phones get a crop where the cabin and the tree stay in frame. */
  imageSmall: "/media/adjust-canada4-compressed-fixedtree2.jpg",
  heading:
    "Experience the breathtaking beauty of Howe Sound, from the comfort of our stunning waterfront wooden cabin. Perfectly situated to offer mesmerizing views and direct access to nature, our cabin provides a serene and unforgettable getaway.",
};

export type FeatureDialog = "landmarks" | "directions" | "occupancy";

export interface Feature {
  id: string;
  title: [string, string];
  icon: string;
  /** Narrower icons are drawn a little smaller, as on the original. */
  narrowIcon?: boolean;
  paragraphs: string[];
  lines?: string[];
  short?: boolean;
}

/** The six items in the strip under the hero. Clicking one reveals its text. */
export const FEATURES: Feature[] = [
  {
    id: "landmarks",
    title: ["Landmarks", "& Activities"],
    icon: "/media/kayak-icon-blue.png",
    narrowIcon: true,
    paragraphs: [
      LANDMARKS.intro,
      "Activities:",
      ...LANDMARKS.activities.map((a) => `${a.title} ${a.text}`),
      "Experience the ultimate relaxation with our sauna, perfect for unwinding after a day of exploring.",
      "Get cosy by the flickering flames of a fire-pit as you enjoy the peaceful darkness, gentle rustling of the wind, and the still of the wilderness around you.",
      "Landmarks:",
      ...LANDMARKS.landmarks,
      LANDMARKS.outro,
    ],
  },
  {
    id: "directions",
    title: ["How to", "get here"],
    icon: "/media/map-icon-blue.png",
    narrowIcon: true,
    paragraphs: [DIRECTIONS.text],
  },
  {
    id: "check-in",
    title: ["Check In", "& Checkout"],
    icon: "/media/key-check-in-icon-blue.png",
    paragraphs: [CHECK_IN],
    lines: [OCCUPANCY.checkIn, OCCUPANCY.checkOut],
  },
  {
    id: "rules",
    title: ["Occupancy", "Rules"],
    icon: "/media/rules-icon-blue.png",
    paragraphs: [HOUSE_RULES],
    lines: ["Quiet hours:", OCCUPANCY.quietHours],
  },
  {
    id: "host",
    title: ["Your", "Host"],
    icon: "/media/host-icon-blue.png",
    paragraphs: [
      "Hello, I am Maria. I live in Squamish and speak English and Swedish. I live a very active lifestyle. Winters are spent skiing or hiking. In the summer we do biking, hiking, paddleboarding and fishing. Squamish is a great playground and we use it every day. I am happy to share all the local secret spots. We desire to provide our guests with an unforgettable escape that nurtures a love for nature, a wonder of wildlife, and provide all the comfort of a vacation.",
    ],
  },
  {
    id: "price",
    title: ["Our", "Price"],
    icon: "/media/price-icon-blue.png",
    narrowIcon: true,
    short: true,
    paragraphs: ["315 USD per night."],
  },
];

export const STORY = {
  heading: ["Here Rustic", "Charm", "Meets Modern", "Comfort"],
  intro:
    "The longer we live in the city, the more we long for the countryside. Take a break from everyday life and head into nature - in our sustainable and carefully furnished cabin. A special stay - close enough for a spontaneous getaway and far enough away to leave your routines behind.",
  mapButton: "Check on the map",
  introImage: { src: "/media/view2.jpg", alt: "Deck beside the sauna overlooking the sound and mountains" },
  rows: [
    {
      big: { src: "/media/kitchen1.jpg", alt: "Kitchen counter beneath a wide window looking out over the water" },
      bigText:
        "We have seamlessly combined the beauty and elegance of sustainable timber framing into the construction of our charming cabin. Relax and unwind in cozy living spaces adorned with rustic decor and ample natural light. All spaces are fully equipped. Sleep soundly in our comfortable bedroom. Stay connected with our high-speed internet if you feel the need to connect with the outside world.",
      clip: "windows" as const,
      smallText:
        "No matter where you are - whether it's the kitchen, bedroom or sauna - each corner of this cabin provides stunning, unforgettable views of the surrounding wilderness, enhancing your relaxation experience.",
      small: {
        src: "/media/bedroom1.jpg",
        alt: "Bedroom with a plaid-covered bed beside a large window overlooking the water",
      },
    },
    {
      big: { src: "/media/highway.jpg", alt: "Yellow gondola cabin above the forest with Howe Sound below" },
      bigText:
        "Experience the ultimate relaxation with our luxurious sauna, perfect for unwinding after a day of exploring. Just turn it on and it will be 80F in 10 minutes! Our sauna is situated so that it provides breathtaking views of Howe Sound. Soak in the serene surroundings and breathe in the fresh ocean air.",
      clip: "gondola" as const,
      smallText:
        "Get a unique perspective of the mountain town of Squamish and the surrounding alpine scenery, as you soar above it all on the Sea to Sky Gondola. It's just 15 minutes walk or 3 minutes drive from our cabin! A 10-minute scenic ride on this aerial tramway brings you to the expansive Summit Lodge, which has a stunning viewing platform, jaw-dropping suspension bridge, two restaurants and a gift shop!",
      small: { src: "/media/sauna2.jpg", alt: "Cedar sauna interior with benches and a heater" },
    },
  ],
  saunaPair: [
    { src: "/media/sauna1.jpg", alt: "Snowy deck leading to the barrel sauna" },
    { src: "/media/sauna3.jpg", alt: "Wooden stairs leading up to the barrel sauna" },
  ],
  night: {
    big: { src: "/media/view6-night.jpg", alt: "Adirondack chairs on the deck at night with the lit cabin behind" },
    bigText:
      "Perched at the tip of Howe Sound and surrounded by rugged coastal mountains, Squamish is a dark sky sanctuary perfect for stargazing or marvelling at the wonder of the Aurora Borealis. See the stars the way they were meant to be seen from your personal deck.",
    video: {
      poster: "/media/camp-stars-poster-00001.jpg",
      mp4: "/media/camp-stars-transcode.mp4",
      webm: "/media/camp-stars-transcode.webm",
    },
    smallText:
      "You’ll feel refreshed and restored as you warm up in front of your indoor fireplace. But we believe there’s nothing better than the natural show that awaits in the darkened sky each night, as you gaze up at the stars from your private deck and get cosy by the flickering flames of your outside fire-pit.",
    small: { src: "/media/view7.jpg", alt: "Deck chairs under a starry night sky above the water" },
  },
  finale: { src: "/media/view8.jpg", alt: "Night-time view of the sound and mountains through the cabin windows" },
  /** City skyline that sits behind the whole section. */
  background: "/media/section-image-04v2-min.jpg",
};

export const ENDING = {
  links: [
    { label: "More photos in the gallery", href: "/gallery" },
    { label: "List of all amenities", dialog: "amenities" as const },
    { label: "Customer reviews", href: "/customer-reviews" },
  ],
  /** The cabin illustration: plays once, then hands over to the looping version (fire and door light). */
  intro: {
    poster: "/media/my-cabin-dif5-poster-00001.jpg",
    mp4: "/media/my-cabin-dif5-transcode.mp4",
    webm: "/media/my-cabin-dif5-transcode.webm",
  },
  loop: {
    poster: "/media/my-cabin-dif6-looped-poster-00001.jpg",
    mp4: "/media/my-cabin-dif6-looped-transcode.mp4",
    webm: "/media/my-cabin-dif6-looped-transcode.webm",
  },
  bookLabel: "Book now!",
};

export const PRELOADER = {
  poster: "/media/mypreloader-mountains-poster-00001.jpg",
  mp4: "/media/mypreloader-mountains-transcode.mp4",
  webm: "/media/mypreloader-mountains-transcode.webm",
};
