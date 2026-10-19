/** Text and images shared across the site: contact details, menu, popups and footer. */

export const CONTACT = {
  phone: "+1 (778) 476-4399",
  phoneHref: "tel:+17784764399",
  email: "info@lakeviewcabins.com",
};

/** Snazzy Maps embed used in the map popups. */
export const MAP_EMBED = "https://snazzymaps.com/embed/624287";

/** Short looping clips (transparent WebM) beside the content blocks. */
export const CLIPS = {
  /** Beside the "Here Rustic Charm" heading and in the menu's directions panel. */
  road: { src: "/media/clips/u2sghrtatxups3ad6drd.webm", width: 1000, height: 1000 },
  /** Above the "No matter where you are" text. */
  windows: { src: "/media/clips/pjdar7hdoygf6l6pq84q.webm", width: 1250, height: 1080 },
  /** Above the gondola text. */
  gondola: { src: "/media/clips/raiziveczkvjkb090hol.webm", width: 1200, height: 1000 },
};

export const LANDMARKS = {
  title: "Activities and Landmarks",
  intro:
    "Ready to experience the beauty and tranquility of this place? Embrace the Great Outdoors. Squamish is a haven for outdoor enthusiasts, offering a wide range of activities right at your doorstep:",
  activities: [
    {
      title: "Hiking and Biking Trails:",
      text: "Explore miles of scenic trails that take you through forests, along rivers, lakes, ocean shores and up mountains.",
    },
    {
      title: "Fishing and Boating:",
      text: "Enjoy fishing or take a leisurely boat ride. There is a private beach that makes it easy to access the ocean while going paddleboarding or canoeing. Paddle boards and kayaks are free to use.",
    },
    {
      title: "Wildlife Viewing:",
      text: "Spot local wildlife, including deer, bears, cougars, eagles, seals, orcas and more in their natural habitats.",
    },
  ],
  landmarks: [
    "5 min walk or 1 min drive up to famous Shannon Falls, the third highest waterfall in BC, where water falls from a height of 335 meters.",
    "15 min walk or 3 min drive to the bottom of the Sea to Sky Gondola aerial tramway. A 10 minute gondola ride will take you 885 meters up to a truly magical place with sweeping views and activities for all interests and ages.",
    "1-2 hour walk/hike up to the top of the massive cliff Squamish Chief (one way).",
    "4 km/2.5 miles to downtown Squamish where you can eat, shop or rent bikes.",
    "The ski resorts are also not far away. It's just 30 minutes drive to the Garibaldi Ranges and about 40 minutes drive to Whistler Blackcomb.",
  ],
  outro: "We cannot count all of the activities this area provides because they are really countless!",
  images: [
    {
      src: "/media/shannon-falls-pools-2-of-2-min-683x1024.jpg",
      alt: "Waterfall pouring into a clear pool among mossy rocks",
    },
    { src: "/media/52351691568-fed27ed0b8-b.jpg", alt: "Waterfall cascading over boulders beside a forest pool" },
    { src: "/media/12369051234-dda28302fe.jpg", alt: "The Stawamus Chief granite cliff above the Sea-to-Sky Highway" },
    {
      src: "/media/f55c259e812b581b9454f9378972aeb8-compressed.jpg",
      alt: "Mountain biker on a rocky summit above Howe Sound",
    },
    { src: "/media/squamish-4.jpg", alt: "Suspension bridge over the forest with snowy peaks behind" },
    { src: "/media/slhanayview-jpg.webp", alt: "Granite cliff overlooking Howe Sound and Squamish" },
    {
      src: "/media/sea-to-sky-gondola-bridge.jpg",
      alt: "Sky Pilot suspension bridge at the top of the Sea to Sky Gondola",
    },
    { src: "/media/squamish-sea-to-sky-compressed.jpg", alt: "Suspension bridge stretching across a forested valley" },
    {
      src: "/media/squamish-2022-robert-brodey-700343-scaled-compressed.jpg",
      alt: "Snow-capped peaks framed by evergreens",
    },
    { src: "/media/waterspritelakewaterspritetower-jpg.webp", alt: "Turquoise alpine lake below rocky peaks" },
  ],
};

export const DIRECTIONS = {
  title: "How to find us",
  text: "If you use your own car it takes 50 minutes drive (60 km) from Vancouver to get here. If you want to use public transport, take the hourly bus that departs from Vancouver city center, from Burrard Station, Bay 6. Get out at Darrell Bay Rd. The journey will take around 1 hour and 50 minutes through one of Canada's most beautiful scenic drives, the “Sea-to-Sky Highway”. The scenic route stretches along the coast of Howe Sound so the time will run fast. You can also use a taxi (+1 604-681-1111, +1 604-871-1111…). There is free parking on site.",
  images: [
    { src: "/media/root2.jpg", alt: "Map of the driving route from Vancouver to the cabin" },
    { src: "/media/root.jpg", alt: "Bus timetable from Burrard Station to Darrell Bay Rd" },
  ],
};

export const CHECK_IN =
  "We strive to make your stay as enjoyable and hassle-free as possible. That's why we offer self check-in, so you can access the place without needing the host to be there, by means of a wall-mounted keypad. Just enter the code that will be provided to you after booking.";

export const HOUSE_RULES =
  "Maximum of 2 guests allowed at the property. No unauthorized guests/visitors. No pets and no smoking. Sorry, no children allowed, it's not safe. Maximum 2 people during your stay due to our water and sewer capacity. No parties. No professional photography.";

export const OCCUPANCY = {
  title: "Occupancy rules",
  checkIn: "Check-in after 4:00 PM",
  checkOut: "Checkout before 11:00 AM",
  quietHours: "10:00 PM - 7:00 AM",
  images: [
    { src: "/media/shutterstock-1496478047-1.jpg", alt: "Hand entering a code on a door keypad" },
    {
      src: "/media/vecteezy-salesmen-are-letting-the-male-customers-sign-the-sales-6969538-compressed.jpg",
      alt: "Rental agreement being signed beside a small model house",
    },
  ],
};
