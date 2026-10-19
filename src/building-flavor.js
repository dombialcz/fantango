// Selected from fantasy-city-flavor-texts.md. Passages describe atmosphere,
// not encounters or promises of a mechanical reward.
export const BUILDING_FLAVOR = {
  tavern: [
    'Laughter rises from the back room. For a moment, the world beyond the door seems far away.',
    'A traveller sits close to the fire, still wearing his gloves. His drink remains untouched.',
    'The innkeeper sets a bowl beside an empty chair. No one asks who it is for.',
    'A battered shield hangs above the hearth. Beneath it, two old friends argue over who carried whom home.',
  ],
  knight: [
    'Steel rings in the courtyard. The youngest recruits still flinch at every blow.',
    'A knight kneels while a squire fastens his armour. Both whisper the same prayer.',
    'An empty bunk has been made with care. Beneath it, a pair of boots waits neatly side by side.',
    'An old knight checks each recruit’s straps himself, grumbling at every loose buckle.',
  ],
  ranger: [
    'Wet cloaks steam beside the hearth. No one has yet spoken of the hunt.',
    'A ranger scrapes black mud from her boots, pausing at something caught in the tread.',
    'Beyond the shutters, a bird calls three times. Someone inside answers.',
    'A young hunter sleeps beside the fire, one hand buried in his hound’s fur.',
  ],
  mage: [
    'A page turns in an empty room. Then another.',
    'Chalk circles cover the floor. Every footstep takes care to avoid them.',
    'An apprentice watches a candle burn blue. When it turns yellow, she finally breathes out.',
    'Behind a locked door, someone asks the same question in a steadily weakening voice.',
  ],
  thief: [
    'Conversation stops as you enter. A moment later, a different conversation begins.',
    'A child practises picking a lock. The woman beside him corrects his grip without looking up.',
    'A map lies beneath a scatter of coins. One house has been crossed out so hard the paper has torn.',
    'Someone has left bread and clean bandages beside the cellar stairs.',
    'You hear a coin being tossed, but never hear it land.',
    'A shadow in the corner grins at you.',
  ],
  cleric: [
    'A cleric washes blood from her hands before tending the next patient.',
    'Someone has fallen asleep halfway through a prayer. The priest lowers his voice.',
    'The stone at the altar’s foot has worn smooth beneath generations of knees.',
    'A wounded soldier asks whether the gods can hear him here. The cleric draws a chair beside his bed.',
  ],
  barbarian: [
    'Fresh sand covers the pit. A dark patch slowly shows through.',
    'A scarred fighter binds a younger warrior’s hands, testing each knot with his thumb.',
    'The crowd roars as a fighter falls. His opponent waits for him to stand.',
    'Between bouts, a hulking warrior sits alone, carefully mending a little wooden horse.',
    'The scent of iron fills the air. Flesh, rather than steel, is tempered here.',
  ],
  bard: [
    'A familiar ballad drifts down the stairs. This version gives the hero a happier end.',
    'An old bard stops a student mid-verse. “I was there,” she says. “He was afraid.”',
    'Someone practises a cheerful tune behind a closed door, stumbling at the same phrase.',
    'A sheet of unfinished music lies beside a list of the dead. Several names have been worked into the margins.',
    'A lover’s hand closes unsteadily around a sword.',
    'By the door, a man restrings his lute with barbed wire.',
  ],
  alchemist: [
    'Something taps against the inside of an opaque jar. The alchemist turns it to face the wall.',
    'A single drop falls into the flask. Everyone watches until the colour settles.',
    'The alchemist holds a healing draught to the light, then pours it away with a tired sigh.',
    'A row of small bottles waits by the door, each marked with a patient’s name.',
    'A bottle hisses, then falls still. The alchemist lets out a slow breath.',
    'Every bottle bears a name. Every name can be found on a tombstone.',
  ],
  cemetery: [
    'The graves are silent, yet you can’t shake the feeling of being judged.',
    'A whisper rides the wind, lost before it forms a word.',
    'Someone has cleared the weeds from a nameless grave.',
    'A mourner brushes rain from a headstone, then rests a hand upon it.',
    'An old soldier stands before a row of graves, cap in hand. His lips move as though taking roll.',
    'A rusted sword marks the grave. Someone has tied a fresh ribbon to its hilt.',
    'A candle gutters in a sheltered niche. Someone waits to see whether it will hold.',
    'From beyond the cemetery wall comes the sound of children playing.',
  ],
};

// A separate cosmetic source avoids consuming the game's Math.random sequence.
const cosmeticRandom = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
export function createBuildingFlavor(random = cosmeticRandom) {
  const bags = new Map();
  const current = new Map();
  return {
    current: type => current.get(type) ?? '',
    next(type) {
      let bag = bags.get(type);
      if (!bag?.length) {
        bag = [...BUILDING_FLAVOR[type]];
        for (let i = bag.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1));
          [bag[i], bag[j]] = [bag[j], bag[i]];
        }
        // Avoid an immediate repeat across shuffle boundaries.
        if (bag.at(-1) === current.get(type)) [bag[0], bag[bag.length - 1]] = [bag.at(-1), bag[0]];
        bags.set(type, bag);
      }
      const passage = bag.pop();
      current.set(type, passage);
      return passage;
    },
  };
}
