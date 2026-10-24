/** Calm, easy-to-read adjectives for generated display names. */
export const ADJECTIVES = [
  "Quiet", "Gentle", "Steady", "Calm", "Brave", "Kind", "Soft", "Bright", "Patient", "Warm",
  "Still", "Open", "Honest", "Hopeful", "Rising", "Silver", "Golden", "Amber", "Misty", "Sunny",
  "Clear", "Wandering", "Early", "Slow", "Tender", "Mellow", "Peaceful", "Resting", "Growing", "Fresh",
  "Cedar", "Willow", "Coastal", "Lunar", "Morning", "Evening", "Northern", "Southern", "Hidden", "Humble",
  "Careful", "Wise", "Faithful", "Lively", "Sheltered", "Windswept", "Mossy", "Dawn",
] as const;

/** Gentle nouns for generated display names. */
export const NOUNS = [
  "Heron", "Sparrow", "Willow", "River", "Lantern", "Meadow", "Harbor", "Pebble", "Maple", "Finch",
  "Orchard", "Lagoon", "Breeze", "Cloud", "Fern", "Robin", "Otter", "Cedar", "Stream", "Dune",
  "Aster", "Kestrel", "Thistle", "Birch", "Brook", "Clover", "Ember", "Falcon", "Garden", "Hollow",
  "Island", "Juniper", "Lark", "Moss", "Nest", "Owl", "Pine", "Reed", "Swallow", "Tide",
  "Valley", "Wren", "Yarrow", "Zephyr", "Compass", "Anchor", "Beacon", "Canopy",
] as const;

/**
 * Words used for recovery phrases. Short, common and unambiguous when read aloud.
 * Eight words from this list are drawn at random; see tests for the uniqueness check.
 */
export const PHRASE_WORDS = [
  "able","acorn","agree","alarm","album","alley","amber","angle","apple","april","arrow","aside",
  "atlas","attic","audio","aunt","award","bacon","badge","baker","basil","beach","bench","berry",
  "bible","bike","birch","blank","blend","bloom","board","boat","bonus","brave","bread","brick",
  "brook","brush","cabin","cable","cache","camel","candy","canoe","carol","cedar","chair","chalk",
  "charm","chess","chime","cider","civic","clerk","cliff","clock","cloud","clove","coach","coast",
  "cocoa","coral","couch","craft","creek","crown","curve","daily","daisy","dance","dawn","decor",
  "delta","denim","diary","dingo","dolly","donor","dowel","dream","drift","drum","eagle","early",
  "earth","easel","ebony","eddy","elbow","elder","ember","empty","enjoy","entry","equal","essay",
  "event","extra","fable","fancy","farm","fauna","feast","fence","fern","ferry","fiber","field",
  "finch","flame","flint","float","flock","flute","focus","forge","frame","fresh","frost","fruit",
  "gamma","garden","gauge","gecko","ginger","glade","glass","globe","glove","grace","grain","grape",
  "grass","green","grove","guide","habit","harbor","hazel","heart","hedge","heron","honey","horse",
  "hotel","house","humor","icing","ideal","igloo","image","index","inlet","iris","ivory","jacket",
  "jelly","jewel","joint","jolly","judge","juice","kayak","kebab","kettle","kiwi","knack","knit",
  "label","lacey","ladle","lagoon","lake","lamp","lance","larch","laser","latch","lemon","lever",
  "light","lilac","linen","llama","lodge","lotus","lucky","lunar","magic","maize","mango","maple",
  "march","marsh","meadow","melon","merit","metal","micro","mimic","mocha","model","moose","motto",
  "mount","music","myrtle","nacho","naval","needle","nest","noble","north","novel","nutmeg","oasis",
  "ocean","olive","onion","opera","orbit","otter","oval","paddle","paint","panda","paper","pearl",
] as const;
