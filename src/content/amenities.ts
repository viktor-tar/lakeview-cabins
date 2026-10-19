/** Amenities shown in the "What this place offers" dialog. Icons live in /public/media/icons. */
export interface Amenity {
  label: string;
  icon: string;
  note?: string;
  /** Narrow icons get side padding so they line up with the square ones. */
  narrow?: boolean;
  /** Listed under "Not included" and shown struck through. */
  excluded?: boolean;
}

export const AMENITY_GROUPS: { title: string; items: Amenity[] }[] = [
  {
    title: "Scenic views",
    items: [
      {
        label: "Bay view",
        icon: "/media/icons/amenity-3.png",
      },
      {
        label: "Harbor view",
        icon: "/media/icons/amenity-2.png",
      },
      {
        label: "Mountain view",
        icon: "/media/icons/amenity-1.png",
      },
      {
        label: "Ocean view",
        icon: "/media/icons/amenity-3.png",
      },
    ],
  },
  {
    title: "Bathroom",
    items: [
      {
        label: "Hair dryer",
        icon: "/media/icons/amenity-4.png",
      },
      {
        label: "Cleaning products",
        icon: "/media/icons/amenity-5.png",
      },
      {
        label: "Shampoo",
        icon: "/media/icons/amenity-6.png",
        narrow: true,
      },
      {
        label: "Conditioner",
        icon: "/media/icons/amenity-6.png",
        narrow: true,
      },
      {
        label: "Body soap",
        icon: "/media/icons/amenity-8.png",
      },
      {
        label: "Hot water",
        icon: "/media/icons/amenity-7.png",
      },
      {
        label: "Shower gel",
        icon: "/media/icons/amenity-8.png",
      },
    ],
  },
  {
    title: "Bedroom and laundry",
    items: [
      {
        label: "Free washer – In building",
        icon: "/media/icons/amenity-9.png",
      },
      {
        label: "Free dryer – In building",
        icon: "/media/icons/amenity-9.png",
      },
      {
        label: "Essentials",
        icon: "/media/icons/amenity-10.png",
        narrow: true,
      },
      {
        label: "Hangers",
        icon: "/media/icons/amenity-11.png",
      },
      {
        label: "Bed linens",
        icon: "/media/icons/amenity-12.png",
      },
      {
        label: "Extra pillows and blankets",
        icon: "/media/icons/amenity-13.png",
      },
      {
        label: "Iron",
        icon: "/media/icons/amenity-15.png",
      },
      {
        label: "Drying rack for clothing",
        icon: "/media/icons/amenity-11.png",
      },
      {
        label: "Mosquito net",
        icon: "/media/icons/amenity-16.png",
      },
      {
        label: "Clothing storage: dresser",
        icon: "/media/icons/amenity-17.png",
      },
    ],
  },
  {
    title: "Entertainment",
    items: [
      {
        label: "Books and reading material",
        icon: "/media/icons/amenity-18.png",
      },
    ],
  },
  {
    title: "Family",
    items: [
      {
        label: "Board games",
        icon: "/media/icons/amenity-19.png",
        narrow: true,
      },
    ],
  },
  {
    title: "Heating and cooling",
    items: [
      {
        label: "Indoor fireplace: wood-burning",
        icon: "/media/icons/amenity-20.png",
      },
      {
        label: "Portable fans",
        icon: "/media/icons/amenity-21.png",
        narrow: true,
      },
      {
        label: "Heating",
        icon: "/media/icons/amenity-22.png",
        narrow: true,
      },
    ],
  },
  {
    title: "Home safety",
    items: [
      {
        label: "Smoke alarm",
        icon: "/media/icons/amenity-23.png",
      },
      {
        label: "Carbon monoxide alarm",
        icon: "/media/icons/amenity-24.png",
      },
      {
        label: "Fire extinguisher",
        icon: "/media/icons/amenity-25.png",
        narrow: true,
      },
      {
        label: "First aid kit",
        icon: "/media/icons/amenity-27.png",
      },
    ],
  },
  {
    title: "Internet and office",
    items: [
      {
        label: "Wifi",
        icon: "/media/wifi.png",
      },
      {
        label: "Dedicated workspace",
        icon: "/media/icons/amenity-28.png",
        note: "In a room with a door",
      },
    ],
  },
  {
    title: "Kitchen and dining",
    items: [
      {
        label: "Kitchen",
        icon: "/media/icons/amenity-29.png",
      },
      {
        label: "Refrigerator",
        icon: "/media/icons/amenity-30.png",
      },
      {
        label: "Cooking basics",
        icon: "/media/icons/amenity-29.png",
        note: "Pots and pans, oil, salt and pepper",
      },
      {
        label: "Dishes and silverware",
        icon: "/media/icons/amenity-31.png",
        note: "Bowls, chopsticks, plates, cups, etc.",
      },
      {
        label: "Freezer",
        icon: "/media/icons/amenity-29.png",
      },
      {
        label: "Electric stove",
        icon: "/media/icons/amenity-32.png",
      },
      {
        label: "Toaster oven",
        icon: "/media/icons/amenity-33.png",
      },
      {
        label: "Coffee maker: french press",
        icon: "/media/icons/amenity-34.png",
      },
      {
        label: "Wine glasses",
        icon: "/media/icons/amenity-35.png",
        narrow: true,
      },
      {
        label: "Toaster",
        icon: "/media/icons/amenity-36.png",
      },
      {
        label: "Baking sheet",
        icon: "/media/icons/amenity-37.png",
      },
      {
        label: "Blender",
        icon: "/media/icons/amenity-38.png",
        narrow: true,
      },
      {
        label: "Dining table",
        icon: "/media/icons/amenity-39.png",
      },
      {
        label: "Coffee",
        icon: "/media/icons/amenity-34.png",
      },
    ],
  },
  {
    title: "Location features",
    items: [
      {
        label: "Waterfront",
        icon: "/media/icons/amenity-3.png",
        note: "Right next to a body of water",
      },
      {
        label: "Beach access – Beachfront",
        icon: "/media/icons/amenity-40.png",
        note: "Guests can enjoy a nearby beach",
      },
      {
        label: "Private entrance",
        icon: "/media/icons/amenity-41.png",
        note: "Separate street or building entrance",
      },
    ],
  },
  {
    title: "Outdoor",
    items: [
      {
        label: "Private patio or balcony",
        icon: "/media/icons/amenity-42.png",
      },
      {
        label: "Private backyard – Not fully fenced",
        icon: "/media/icons/amenity-43.png",
        note: "An open space on the property usually covered in grass",
      },
      {
        label: "Outdoor furniture",
        icon: "/media/icons/amenity-44.png",
      },
      {
        label: "Outdoor dining area",
        icon: "/media/icons/amenity-44.png",
      },
      {
        label: "Private BBQ grill: charcoal",
        icon: "/media/icons/amenity-47.png",
      },
      {
        label: "Kayak",
        icon: "/media/icons/amenity-46.png",
      },
      {
        label: "Sun loungers",
        icon: "/media/icons/amenity-45.png",
      },
    ],
  },
  {
    title: "Parking and facilities",
    items: [
      {
        label: "Free parking on premises",
        icon: "/media/icons/amenity-48.png",
      },
      {
        label: "Free street parking",
        icon: "/media/icons/amenity-48.png",
      },
      {
        label: "Private sauna",
        icon: "/media/icons/amenity-49.png",
      },
    ],
  },
  {
    title: "Services",
    items: [
      {
        label: "Long term stays allowed",
        icon: "/media/icons/amenity-50.png",
        note: "Allow stay for 28 days or more",
      },
      {
        label: "Self check-in",
        icon: "/media/icons/amenity-51.png",
      },
      {
        label: "Keypad",
        icon: "/media/icons/amenity-52.png",
        note: "Check yourself into the home with a door code",
      },
    ],
  },
  {
    title: "Not included",
    items: [
      {
        label: "Exterior security cameras on property",
        icon: "/media/icons/amenity-53.png",
        excluded: true,
      },
      {
        label: "TV",
        icon: "/media/icons/amenity-54.png",
        excluded: true,
      },
      {
        label: "Air conditioning",
        icon: "/media/icons/amenity-55.png",
        excluded: true,
      },
    ],
  },
];
