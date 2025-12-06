/**
 * Comprehensive breed database for veterinary clinic
 * Static data - breeds don't change often
 * Sources: AKC, CFA, ARBA, and other breed registries
 */

export interface BreedInfo {
  name: string;
  aliases?: string[];
}

export const dogBreeds: BreedInfo[] = [
  // Sporting Group
  { name: 'Golden Retriever' },
  { name: 'Labrador Retriever' },
  { name: 'German Shorthaired Pointer' },
  { name: 'Brittany' },
  { name: 'English Springer Spaniel' },
  { name: 'Cocker Spaniel' },
  { name: 'Vizsla' },
  { name: 'Weimaraner' },
  { name: 'Irish Setter' },
  { name: 'English Setter' },
  { name: 'Chesapeake Bay Retriever' },
  { name: 'Nova Scotia Duck Tolling Retriever' },
  { name: 'Flat-Coated Retriever' },
  { name: 'Curly-Coated Retriever' },
  { name: 'Irish Water Spaniel' },
  { name: 'Clumber Spaniel' },
  { name: 'Field Spaniel' },
  { name: 'Sussex Spaniel' },
  { name: 'Welsh Springer Spaniel' },
  { name: 'Wirehaired Pointing Griffon' },

  // Hound Group
  { name: 'Beagle' },
  { name: 'Dachshund' },
  { name: 'Basset Hound' },
  { name: 'Bloodhound' },
  { name: 'Greyhound' },
  { name: 'Whippet' },
  { name: 'Afghan Hound' },
  { name: 'Irish Wolfhound' },
  { name: 'Scottish Deerhound' },
  { name: 'Borzoi' },
  { name: 'Saluki' },
  { name: 'Rhodesian Ridgeback' },
  { name: 'Basenji' },
  { name: 'Pharaoh Hound' },
  { name: 'Ibizan Hound' },
  { name: 'Norwegian Elkhound' },
  { name: 'Black and Tan Coonhound' },
  { name: 'Bluetick Coonhound' },
  { name: 'Redbone Coonhound' },
  { name: 'Treeing Walker Coonhound' },
  { name: 'American Foxhound' },
  { name: 'English Foxhound' },
  { name: 'Harrier' },
  { name: 'Otterhound' },
  { name: 'Petit Basset Griffon Vendéen' },
  { name: 'Plott Hound' },

  // Working Group
  { name: 'German Shepherd', aliases: ['GSD', 'Alsatian'] },
  { name: 'Rottweiler' },
  { name: 'Doberman Pinscher' },
  { name: 'Boxer' },
  { name: 'Great Dane' },
  { name: 'Mastiff', aliases: ['English Mastiff'] },
  { name: 'Bullmastiff' },
  { name: 'Saint Bernard' },
  { name: 'Bernese Mountain Dog' },
  { name: 'Greater Swiss Mountain Dog' },
  { name: 'Newfoundland' },
  { name: 'Great Pyrenees' },
  { name: 'Akita' },
  { name: 'Alaskan Malamute' },
  { name: 'Siberian Husky' },
  { name: 'Samoyed' },
  { name: 'Portuguese Water Dog' },
  { name: 'Standard Schnauzer' },
  { name: 'Giant Schnauzer' },
  { name: 'Komondor' },
  { name: 'Kuvasz' },
  { name: 'Leonberger' },
  { name: 'Tibetan Mastiff' },
  { name: 'Cane Corso' },
  { name: 'Dogue de Bordeaux' },
  { name: 'Neapolitan Mastiff' },
  { name: 'Boerboel' },
  { name: 'Black Russian Terrier' },
  { name: 'Chinook' },

  // Terrier Group
  { name: 'Yorkshire Terrier', aliases: ['Yorkie'] },
  { name: 'West Highland White Terrier', aliases: ['Westie'] },
  { name: 'Scottish Terrier', aliases: ['Scottie'] },
  { name: 'Cairn Terrier' },
  { name: 'Jack Russell Terrier' },
  { name: 'Parson Russell Terrier' },
  { name: 'Russell Terrier' },
  { name: 'Bull Terrier' },
  { name: 'Miniature Bull Terrier' },
  { name: 'Staffordshire Bull Terrier' },
  { name: 'American Staffordshire Terrier' },
  { name: 'Airedale Terrier' },
  { name: 'Welsh Terrier' },
  { name: 'Irish Terrier' },
  { name: 'Kerry Blue Terrier' },
  { name: 'Soft Coated Wheaten Terrier' },
  { name: 'Bedlington Terrier' },
  { name: 'Border Terrier' },
  { name: 'Norwich Terrier' },
  { name: 'Norfolk Terrier' },
  { name: 'Australian Terrier' },
  { name: 'Silky Terrier' },
  { name: 'Miniature Schnauzer' },
  { name: 'Rat Terrier' },
  { name: 'American Hairless Terrier' },
  { name: 'Lakeland Terrier' },
  { name: 'Manchester Terrier' },
  { name: 'Dandie Dinmont Terrier' },
  { name: 'Sealyham Terrier' },
  { name: 'Skye Terrier' },
  { name: 'Glen of Imaal Terrier' },
  { name: 'Cesky Terrier' },

  // Toy Group
  { name: 'Chihuahua' },
  { name: 'Pomeranian' },
  { name: 'Toy Poodle' },
  { name: 'Shih Tzu' },
  { name: 'Maltese' },
  { name: 'Pug' },
  { name: 'Cavalier King Charles Spaniel' },
  { name: 'Papillon' },
  { name: 'Havanese' },
  { name: 'Pekingese' },
  { name: 'Chinese Crested' },
  { name: 'Italian Greyhound' },
  { name: 'Toy Fox Terrier' },
  { name: 'Japanese Chin' },
  { name: 'Miniature Pinscher', aliases: ['Min Pin'] },
  { name: 'Brussels Griffon' },
  { name: 'Affenpinscher' },
  { name: 'English Toy Spaniel' },
  { name: 'Biewer Terrier' },
  { name: 'Russian Toy' },

  // Non-Sporting Group
  { name: 'Poodle', aliases: ['Standard Poodle'] },
  { name: 'Miniature Poodle' },
  { name: 'French Bulldog', aliases: ['Frenchie'] },
  { name: 'Bulldog', aliases: ['English Bulldog'] },
  { name: 'Boston Terrier' },
  { name: 'Bichon Frise' },
  { name: 'Lhasa Apso' },
  { name: 'Shiba Inu' },
  { name: 'Chow Chow' },
  { name: 'Dalmatian' },
  { name: 'Keeshond' },
  { name: 'Tibetan Spaniel' },
  { name: 'Tibetan Terrier' },
  { name: 'Chinese Shar-Pei' },
  { name: 'Finnish Spitz' },
  { name: 'Schipperke' },
  { name: 'American Eskimo Dog' },
  { name: 'Lowchen' },
  { name: 'Coton de Tulear' },
  { name: 'Norwegian Lundehund' },
  { name: 'Xoloitzcuintli', aliases: ['Mexican Hairless', 'Xolo'] },

  // Herding Group
  { name: 'Border Collie' },
  { name: 'Australian Shepherd', aliases: ['Aussie'] },
  { name: 'Shetland Sheepdog', aliases: ['Sheltie'] },
  { name: 'Pembroke Welsh Corgi' },
  { name: 'Cardigan Welsh Corgi' },
  { name: 'Australian Cattle Dog', aliases: ['Blue Heeler', 'Red Heeler'] },
  { name: 'Belgian Malinois' },
  { name: 'Belgian Sheepdog' },
  { name: 'Belgian Tervuren' },
  { name: 'Collie' },
  { name: 'Old English Sheepdog' },
  { name: 'Bearded Collie' },
  { name: 'Bouvier des Flandres' },
  { name: 'Briard' },
  { name: 'German Shepherd Dog' },
  { name: 'Canaan Dog' },
  { name: 'Entlebucher Mountain Dog' },
  { name: 'Finnish Lapphund' },
  { name: 'Icelandic Sheepdog' },
  { name: 'Miniature American Shepherd' },
  { name: 'Mudi' },
  { name: 'Norwegian Buhund' },
  { name: 'Polish Lowland Sheepdog' },
  { name: 'Puli' },
  { name: 'Pumi' },
  { name: 'Pyrenean Shepherd' },
  { name: 'Spanish Water Dog' },
  { name: 'Swedish Vallhund' },
  { name: 'Bergamasco Sheepdog' },
  { name: 'Berger Picard' },

  // Popular Mixed Breeds / Designer Dogs
  { name: 'Goldendoodle', aliases: ['Golden Doodle'] },
  { name: 'Labradoodle' },
  { name: 'Cockapoo' },
  { name: 'Maltipoo' },
  { name: 'Cavapoo' },
  { name: 'Bernedoodle' },
  { name: 'Aussiedoodle' },
  { name: 'Sheepadoodle' },
  { name: 'Pomsky' },
  { name: 'Puggle' },
  { name: 'Morkie' },
  { name: 'Chorkie' },
  { name: 'Schnoodle' },
  { name: 'Yorkipoo' },
  { name: 'Cavachon' },
  { name: 'Shih-Poo' },
  { name: 'Shorkie' },
  { name: 'Chiweenie' },

  // Other / Generic
  { name: 'Mixed Breed', aliases: ['Mutt', 'Mixed'] },
  { name: 'Unknown' },
].sort((a, b) => a.name.localeCompare(b.name));

export const catBreeds: BreedInfo[] = [
  // Long-haired breeds
  { name: 'Persian' },
  { name: 'Maine Coon' },
  { name: 'Ragdoll' },
  { name: 'Norwegian Forest Cat' },
  { name: 'Siberian' },
  { name: 'Himalayan' },
  { name: 'Birman' },
  { name: 'Turkish Angora' },
  { name: 'Turkish Van' },
  { name: 'Balinese' },
  { name: 'Javanese' },
  { name: 'Somali' },
  { name: 'Nebelung' },
  { name: 'RagaMuffin' },
  { name: 'Selkirk Rex' },
  { name: 'LaPerm' },
  { name: 'Cymric' },
  { name: 'Chantilly-Tiffany' },

  // Short-haired breeds
  { name: 'Domestic Shorthair', aliases: ['DSH'] },
  { name: 'Domestic Longhair', aliases: ['DLH'] },
  { name: 'Domestic Medium Hair', aliases: ['DMH'] },
  { name: 'British Shorthair' },
  { name: 'American Shorthair' },
  { name: 'Siamese' },
  { name: 'Abyssinian' },
  { name: 'Bengal' },
  { name: 'Russian Blue' },
  { name: 'Scottish Fold' },
  { name: 'Burmese' },
  { name: 'Bombay' },
  { name: 'Exotic Shorthair' },
  { name: 'Devon Rex' },
  { name: 'Cornish Rex' },
  { name: 'Sphynx', aliases: ['Hairless'] },
  { name: 'Oriental Shorthair' },
  { name: 'Tonkinese' },
  { name: 'Egyptian Mau' },
  { name: 'Ocicat' },
  { name: 'Chartreux' },
  { name: 'Korat' },
  { name: 'Manx' },
  { name: 'Singapura' },
  { name: 'American Curl' },
  { name: 'American Wirehair' },
  { name: 'Havana Brown' },
  { name: 'Japanese Bobtail' },
  { name: 'Burmilla' },
  { name: 'European Shorthair' },
  { name: 'Snowshoe' },
  { name: 'American Bobtail' },
  { name: 'Pixie-Bob' },
  { name: 'Toyger' },
  { name: 'Savannah' },
  { name: 'Chausie' },
  { name: 'Khao Manee' },
  { name: 'Lykoi', aliases: ['Werewolf Cat'] },

  // Color patterns (often used as breed names)
  { name: 'Tabby' },
  { name: 'Tuxedo' },
  { name: 'Calico' },
  { name: 'Tortoiseshell', aliases: ['Tortie'] },
  { name: 'Orange Tabby', aliases: ['Ginger', 'Marmalade'] },
  { name: 'Black Cat' },
  { name: 'White Cat' },
  { name: 'Gray Cat' },

  // Other / Generic
  { name: 'Mixed Breed' },
  { name: 'Unknown' },
].sort((a, b) => a.name.localeCompare(b.name));

export const rabbitBreeds: BreedInfo[] = [
  // Small breeds (under 4 lbs)
  { name: 'Netherland Dwarf' },
  { name: 'Holland Lop' },
  { name: 'Mini Rex' },
  { name: 'Mini Lop' },
  { name: 'Polish' },
  { name: 'Dwarf Hotot' },
  { name: 'Jersey Wooly' },
  { name: 'American Fuzzy Lop' },
  { name: 'Britannia Petite' },
  { name: 'Lionhead' },

  // Medium breeds (4-8 lbs)
  { name: 'Dutch' },
  { name: 'Mini Satin' },
  { name: 'Florida White' },
  { name: 'Havana' },
  { name: 'Standard Chinchilla' },
  { name: 'English Angora' },
  { name: 'French Angora' },
  { name: 'Satin Angora' },
  { name: 'Tan' },
  { name: 'Thrianta' },
  { name: 'Silver' },
  { name: 'Silver Marten' },
  { name: 'Rhinelander' },
  { name: 'Harlequin' },
  { name: 'English Spot' },

  // Large breeds (8-11 lbs)
  { name: 'Rex' },
  { name: 'Satin' },
  { name: 'Californian' },
  { name: 'New Zealand' },
  { name: 'Palomino' },
  { name: 'Cinnamon' },
  { name: 'Champagne d\'Argent' },
  { name: 'American' },
  { name: 'American Sable' },
  { name: 'Beveren' },
  { name: 'Blanc de Hotot' },
  { name: 'Crème d\'Argent' },
  { name: 'English Lop' },
  { name: 'French Lop' },
  { name: 'Silver Fox' },

  // Giant breeds (over 11 lbs)
  { name: 'Flemish Giant' },
  { name: 'Giant Chinchilla' },
  { name: 'Checkered Giant' },
  { name: 'Giant Angora' },
  { name: 'Continental Giant' },
  { name: 'British Giant' },

  // Other
  { name: 'Mixed Breed' },
  { name: 'Unknown' },
].sort((a, b) => a.name.localeCompare(b.name));

export const birdBreeds: BreedInfo[] = [
  // Parrots - Small
  { name: 'Budgerigar', aliases: ['Budgie', 'Parakeet'] },
  { name: 'Cockatiel' },
  { name: 'Lovebird' },
  { name: 'Parrotlet' },
  { name: 'Lineolated Parakeet' },
  { name: 'Bourke\'s Parakeet' },

  // Parrots - Medium
  { name: 'Conure' },
  { name: 'Green Cheek Conure' },
  { name: 'Sun Conure' },
  { name: 'Jenday Conure' },
  { name: 'Nanday Conure' },
  { name: 'Quaker Parrot', aliases: ['Monk Parakeet'] },
  { name: 'Ring-necked Parakeet', aliases: ['Indian Ringneck'] },
  { name: 'Senegal Parrot' },
  { name: 'Meyer\'s Parrot' },
  { name: 'Red-bellied Parrot' },
  { name: 'Caique' },
  { name: 'Pionus' },
  { name: 'Lorikeet' },
  { name: 'Lory' },

  // Parrots - Large
  { name: 'African Grey' },
  { name: 'Amazon Parrot' },
  { name: 'Blue-fronted Amazon' },
  { name: 'Yellow-naped Amazon' },
  { name: 'Double Yellow-headed Amazon' },
  { name: 'Eclectus' },
  { name: 'Cockatoo' },
  { name: 'Sulphur-crested Cockatoo' },
  { name: 'Umbrella Cockatoo' },
  { name: 'Moluccan Cockatoo' },
  { name: 'Goffin\'s Cockatoo' },
  { name: 'Rose-breasted Cockatoo', aliases: ['Galah'] },
  { name: 'Macaw' },
  { name: 'Blue and Gold Macaw' },
  { name: 'Scarlet Macaw' },
  { name: 'Green-winged Macaw' },
  { name: 'Hyacinth Macaw' },
  { name: 'Hahn\'s Macaw' },
  { name: 'Military Macaw' },

  // Finches
  { name: 'Zebra Finch' },
  { name: 'Society Finch' },
  { name: 'Gouldian Finch' },
  { name: 'Canary' },
  { name: 'Java Finch' },
  { name: 'Owl Finch' },
  { name: 'Spice Finch' },
  { name: 'Shaft-tail Finch' },

  // Doves & Pigeons
  { name: 'Ring-necked Dove' },
  { name: 'Diamond Dove' },
  { name: 'White Dove' },
  { name: 'Racing Pigeon' },
  { name: 'Fancy Pigeon' },

  // Softbills
  { name: 'Mynah' },
  { name: 'Toucan' },
  { name: 'Starling' },

  // Poultry (sometimes kept as pets)
  { name: 'Chicken' },
  { name: 'Duck' },
  { name: 'Goose' },
  { name: 'Turkey' },
  { name: 'Quail' },
  { name: 'Peafowl', aliases: ['Peacock'] },
  { name: 'Guinea Fowl' },

  // Other
  { name: 'Mixed/Unknown Species' },
  { name: 'Unknown' },
].sort((a, b) => a.name.localeCompare(b.name));

export const reptileBreeds: BreedInfo[] = [
  // Lizards - Geckos
  { name: 'Leopard Gecko' },
  { name: 'Crested Gecko' },
  { name: 'Gargoyle Gecko' },
  { name: 'African Fat-tailed Gecko' },
  { name: 'Tokay Gecko' },
  { name: 'Day Gecko' },
  { name: 'Leachianus Gecko' },

  // Lizards - Dragons & Monitors
  { name: 'Bearded Dragon' },
  { name: 'Chinese Water Dragon' },
  { name: 'Frilled Dragon' },
  { name: 'Uromastyx' },
  { name: 'Savannah Monitor' },
  { name: 'Ackie Monitor' },
  { name: 'Nile Monitor' },
  { name: 'Asian Water Monitor' },
  { name: 'Tegus' },
  { name: 'Argentine Black and White Tegu' },
  { name: 'Red Tegu' },

  // Lizards - Iguanas
  { name: 'Green Iguana' },
  { name: 'Blue Iguana' },
  { name: 'Red Iguana' },
  { name: 'Desert Iguana' },
  { name: 'Spiny-tailed Iguana' },

  // Lizards - Chameleons
  { name: 'Veiled Chameleon' },
  { name: 'Panther Chameleon' },
  { name: 'Jackson\'s Chameleon' },
  { name: 'Carpet Chameleon' },
  { name: 'Pygmy Chameleon' },

  // Lizards - Skinks
  { name: 'Blue-tongued Skink' },
  { name: 'Fire Skink' },
  { name: 'Schneider\'s Skink' },
  { name: 'Pink-tongued Skink' },

  // Lizards - Other
  { name: 'Anole' },
  { name: 'Green Anole' },
  { name: 'Brown Anole' },
  { name: 'Long-tailed Lizard' },
  { name: 'Armadillo Lizard' },

  // Snakes - Colubrids
  { name: 'Corn Snake' },
  { name: 'Ball Python' },
  { name: 'King Snake' },
  { name: 'California Kingsnake' },
  { name: 'Milk Snake' },
  { name: 'Garter Snake' },
  { name: 'Rat Snake' },
  { name: 'Hognose Snake' },
  { name: 'Gopher Snake' },
  { name: 'Bull Snake' },
  { name: 'Ringneck Snake' },

  // Snakes - Pythons
  { name: 'Burmese Python' },
  { name: 'Reticulated Python' },
  { name: 'Carpet Python' },
  { name: 'Green Tree Python' },
  { name: 'Blood Python' },
  { name: 'Children\'s Python' },
  { name: 'Woma Python' },

  // Snakes - Boas
  { name: 'Boa Constrictor' },
  { name: 'Red-tailed Boa' },
  { name: 'Rainbow Boa' },
  { name: 'Rosy Boa' },
  { name: 'Sand Boa' },
  { name: 'Emerald Tree Boa' },
  { name: 'Amazon Tree Boa' },

  // Turtles & Tortoises
  { name: 'Red-eared Slider' },
  { name: 'Painted Turtle' },
  { name: 'Box Turtle' },
  { name: 'Map Turtle' },
  { name: 'Musk Turtle' },
  { name: 'Mud Turtle' },
  { name: 'Softshell Turtle' },
  { name: 'Snapping Turtle' },
  { name: 'Russian Tortoise' },
  { name: 'Greek Tortoise' },
  { name: 'Hermann\'s Tortoise' },
  { name: 'Sulcata Tortoise', aliases: ['African Spurred Tortoise'] },
  { name: 'Leopard Tortoise' },
  { name: 'Red-footed Tortoise' },
  { name: 'Yellow-footed Tortoise' },
  { name: 'Pancake Tortoise' },
  { name: 'Indian Star Tortoise' },

  // Crocodilians
  { name: 'Caiman' },
  { name: 'Dwarf Caiman' },
  { name: 'American Alligator' },

  // Other
  { name: 'Mixed/Unknown Species' },
  { name: 'Unknown' },
].sort((a, b) => a.name.localeCompare(b.name));

// Other small pets sometimes seen by vets
export const otherPetBreeds: BreedInfo[] = [
  // Rodents
  { name: 'Hamster - Syrian' },
  { name: 'Hamster - Dwarf' },
  { name: 'Hamster - Roborovski' },
  { name: 'Guinea Pig' },
  { name: 'Guinea Pig - American' },
  { name: 'Guinea Pig - Abyssinian' },
  { name: 'Guinea Pig - Peruvian' },
  { name: 'Chinchilla' },
  { name: 'Gerbil' },
  { name: 'Mouse' },
  { name: 'Rat' },
  { name: 'Rat - Fancy' },
  { name: 'Rat - Dumbo' },
  { name: 'Degu' },
  { name: 'Sugar Glider' },

  // Ferrets
  { name: 'Ferret' },
  { name: 'Ferret - Sable' },
  { name: 'Ferret - Albino' },

  // Hedgehogs
  { name: 'African Pygmy Hedgehog' },

  // Amphibians
  { name: 'Frog' },
  { name: 'Tree Frog' },
  { name: 'Poison Dart Frog' },
  { name: 'Pacman Frog' },
  { name: 'African Clawed Frog' },
  { name: 'Axolotl' },
  { name: 'Salamander' },
  { name: 'Fire-bellied Newt' },
  { name: 'Tiger Salamander' },

  // Fish (sometimes require vet care)
  { name: 'Goldfish' },
  { name: 'Koi' },
  { name: 'Betta' },

  // Other
  { name: 'Hermit Crab' },
  { name: 'Tarantula' },
  { name: 'Scorpion' },
  { name: 'Unknown' },
].sort((a, b) => a.name.localeCompare(b.name));

// Species to breed mapping
export const breedsBySpecies: Record<string, BreedInfo[]> = {
  dog: dogBreeds,
  cat: catBreeds,
  rabbit: rabbitBreeds,
  bird: birdBreeds,
  reptile: reptileBreeds,
  other: otherPetBreeds,
};

/**
 * Search breeds by name with fuzzy matching
 */
export function searchBreeds(species: string, query: string): BreedInfo[] {
  const breeds = breedsBySpecies[species.toLowerCase()] || [];
  if (!query.trim()) return breeds.slice(0, 20); // Return first 20 if no query

  const lowerQuery = query.toLowerCase();

  return breeds.filter((breed) => {
    // Check main name
    if (breed.name.toLowerCase().includes(lowerQuery)) return true;
    // Check aliases
    if (breed.aliases?.some((alias) => alias.toLowerCase().includes(lowerQuery))) return true;
    return false;
  });
}

/**
 * Get all breeds for a species
 */
export function getAllBreeds(species: string): BreedInfo[] {
  return breedsBySpecies[species.toLowerCase()] || [];
}
