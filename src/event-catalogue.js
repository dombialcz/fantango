// Authored in VAULTBOUND_EVENTS.md. Rebuild with node scripts/build-event-catalogue.mjs.
export const ENCOUNTERS = [
  {
    "id": "G01",
    "title": "The wounded courier",
    "pool": "general",
    "description": "A courier lies against a milestone. One hand presses a bleeding wound; the other holds a sealed dispatch. Footsteps echo beyond the bend.",
    "choices": [
      {
        "label": "Bind the wound and conceal the courier.",
        "kind": "compassionate",
        "good": {
          "text": "the courier marks a sheltered cache on your map before slipping away.",
          "effect": "Small cache"
        },
        "bad": {
          "text": "the patrol reaches the bend before the bandage is tied; a hero is hurt getting the courier into cover.",
          "effect": "Wound"
        }
      },
      {
        "label": "Take the dispatch and leave the courier behind.",
        "kind": "selfish",
        "good": {
          "text": "a payment warrant inside leads to a much larger cache.",
          "effect": "Large cache"
        },
        "bad": {
          "text": "your company recognises the seal of people still waiting for this message. Nobody will meet your eyes.",
          "effect": "Dismay"
        }
      }
    ]
  },
  {
    "id": "G02",
    "title": "The last clean well",
    "pool": "general",
    "description": "A family has drawn the last clear bucket from a well fouled by the fighting. Your company has been drinking from its own dwindling skins.",
    "choices": [
      {
        "label": "Help the family draw water from deeper down.",
        "kind": "compassionate",
        "good": {
          "text": "together you reach clean water, enough to share.",
          "effect": "Shared care"
        },
        "bad": {
          "text": "the rope breaks and a hero is dragged against the stone rim.",
          "effect": "Wound"
        }
      },
      {
        "label": "Claim the clean bucket for the company.",
        "kind": "selfish",
        "good": {
          "text": "the water restores the whole party. The family watches you drink.",
          "effect": "Feast"
        },
        "bad": {
          "text": "someone refuses their share; the quarrel follows you away from the well.",
          "effect": "Discord"
        }
      }
    ]
  },
  {
    "id": "G03",
    "title": "The coins of the dead",
    "pool": "general",
    "description": "Fresh graves line a passage. Coins have been set on the shrouds, and something has disturbed the earth around them.",
    "choices": [
      {
        "label": "Rebury the exposed bodies.",
        "kind": "compassionate",
        "good": {
          "text": "finishing the work gives the company a moment of purpose.",
          "effect": "Resolve"
        },
        "bad": {
          "text": "exhaustion and the smell of the graves follow you back into the passage.",
          "effect": "Doubt"
        }
      },
      {
        "label": "Strip the shrouds of their coins.",
        "kind": "selfish",
        "good": {
          "text": "the dead carried more than their burial offerings.",
          "effect": "Large cache"
        },
        "bad": {
          "text": "a familiar regiment's badge hangs beneath one shroud. The company leaves in silence.",
          "effect": "Dismay"
        }
      }
    ]
  },
  {
    "id": "G04",
    "title": "Refugees on the ledge",
    "pool": "general",
    "description": "Refugees cling to a narrow shelf above a broken stair. A rope bridge blocks the way to their abandoned baggage.",
    "choices": [
      {
        "label": "Secure a rope and bring them across.",
        "kind": "compassionate",
        "good": {
          "text": "one survivor is a contract broker and promises an introduction in town.",
          "effect": "One contract favour"
        },
        "bad": {
          "text": "the last crossing pulls a hero into the rock face.",
          "effect": "Wound"
        }
      },
      {
        "label": "Cut down their baggage and leave them stranded.",
        "kind": "selfish",
        "good": {
          "text": "the packs contain the valuables they hoped to carry to safety.",
          "effect": "Large cache"
        },
        "bad": {
          "text": "the falling packs bring part of the stair down on the company.",
          "effect": "Party strain"
        }
      }
    ]
  },
  {
    "id": "G05",
    "title": "The abandoned merchant's chest",
    "pool": "general",
    "description": "A locked chest sits beneath a chalked merchant's mark. A note asks whoever finds it to leave it for the owner's return.",
    "choices": [
      {
        "label": "Hide the chest and mark a safe route to it.",
        "kind": "compassionate",
        "good": {
          "text": "the returning owner catches up with you and offers a reward.",
          "effect": "Small cache"
        },
        "bad": {
          "text": "you find only an empty hiding place when the owner returns; the dispute costs time and trust.",
          "effect": "Doubt"
        }
      },
      {
        "label": "Break the lock and divide the contents.",
        "kind": "selfish",
        "good": {
          "text": "the lining conceals a second purse.",
          "effect": "Large cache"
        },
        "bad": {
          "text": "a spring blade catches the hero levering open the lid.",
          "effect": "Deep wound"
        }
      }
    ]
  },
  {
    "id": "G06",
    "title": "The trapped scavenger",
    "pool": "general",
    "description": "A scavenger is pinned beneath a beam, within reach of a satchel full of salvage. The ceiling sheds dust with every breath.",
    "choices": [
      {
        "label": "Lift the beam together.",
        "kind": "compassionate",
        "good": {
          "text": "the scavenger shares a safe approach to the next chamber.",
          "effect": "Edge"
        },
        "bad": {
          "text": "the beam shifts and crushes a hero's hand before everyone pulls free.",
          "effect": "Wound"
        }
      },
      {
        "label": "Take the satchel and leave the beam where it lies.",
        "kind": "selfish",
        "good": {
          "text": "the salvage includes a pouch of saleable fittings.",
          "effect": "Large cache"
        },
        "bad": {
          "text": "the snagged satchel pulls the remaining supports loose as you drag it away.",
          "effect": "Party strain"
        }
      }
    ]
  },
  {
    "id": "G07",
    "title": "The fever shelter",
    "pool": "general",
    "description": "Several travellers lie beneath patched blankets. Their attendant asks for help carrying clean water from a cistern across the chamber.",
    "choices": [
      {
        "label": "Fetch the water and tend the sick.",
        "kind": "compassionate",
        "good": {
          "text": "the attendant treats the company's worst wound in return.",
          "effect": "Restore"
        },
        "bad": {
          "text": "the work leaves you shaken by how little separates the sick from the dying.",
          "effect": "Hesitation"
        }
      },
      {
        "label": "Take the attendant's unused supplies.",
        "kind": "selfish",
        "good": {
          "text": "the stolen dressings and tonic restore the company.",
          "effect": "Feast"
        },
        "bad": {
          "text": "the travellers' cries follow you down the passage; the company cannot agree to stop or return.",
          "effect": "Dismay"
        }
      }
    ]
  },
  {
    "id": "G08",
    "title": "The cracked wayside shrine",
    "pool": "general",
    "description": "A small shrine has split from floor to altar. A votive chain is caught beneath its stone saint, and a lamp still burns beside it.",
    "choices": [
      {
        "label": "Raise the statue and relight the shrine.",
        "kind": "compassionate",
        "good": {
          "text": "the familiar rite steadies the company.",
          "effect": "Resolve"
        },
        "bad": {
          "text": "the cracked stone shifts while a hero supports it.",
          "effect": "Wound"
        }
      },
      {
        "label": "Pry out the votive chain.",
        "kind": "selfish",
        "good": {
          "text": "the links are solid silver.",
          "effect": "Large cache"
        },
        "bad": {
          "text": "the statue topples and the company scrambles through falling stone.",
          "effect": "Party strain"
        }
      }
    ]
  },
  {
    "id": "G09",
    "title": "The fallen company",
    "pool": "general",
    "description": "Another expedition lies dead around a cold camp. A journal names the people waiting for them, beside a careful inventory of their belongings.",
    "choices": [
      {
        "label": "Gather their names and leave their belongings for recovery.",
        "kind": "compassionate",
        "good": {
          "text": "the final pages describe the enemy's movements ahead.",
          "effect": "Edge"
        },
        "bad": {
          "text": "reading their last days saps the company's confidence.",
          "effect": "Doubt"
        }
      },
      {
        "label": "Strip the camp and destroy the inventory.",
        "kind": "selfish",
        "good": {
          "text": "coin and trade goods fill your packs.",
          "effect": "Large cache"
        },
        "bad": {
          "text": "someone finds a letter tucked beneath a stolen keepsake. Your next orders meet only silence.",
          "effect": "Dismay"
        }
      }
    ]
  },
  {
    "id": "G10",
    "title": "The frightened tollkeeper",
    "pool": "general",
    "description": "An old tollkeeper has barricaded a narrow gate. He has orders to admit nobody, but his shaking hands can barely hold the key.",
    "choices": [
      {
        "label": "Persuade him to open the gate and leave his post.",
        "kind": "compassionate",
        "good": {
          "text": "he draws the next chamber's patrol route before departing.",
          "effect": "Edge"
        },
        "bad": {
          "text": "the long negotiation gives the enemy time to change its watch.",
          "effect": "Hesitation"
        }
      },
      {
        "label": "Threaten him into handing over the gatehouse purse.",
        "kind": "selfish",
        "good": {
          "text": "he gives you the week's collections.",
          "effect": "Large cache"
        },
        "bad": {
          "text": "his panicked cry draws a response from beyond the gate, and the retreat leaves a hero badly hurt.",
          "effect": "Deep wound"
        }
      }
    ]
  },
  {
    "id": "G11",
    "title": "The last lamp",
    "pool": "general",
    "description": "You find a lost traveller beside a nearly spent lamp. There is oil enough for one route: their way back or your way deeper.",
    "choices": [
      {
        "label": "Give the traveller the oil.",
        "kind": "compassionate",
        "good": {
          "text": "they leave you an accurate sketch of the passages they escaped.",
          "effect": "Edge"
        },
        "bad": {
          "text": "without the extra light, your company struggles to find its bearings.",
          "effect": "Hesitation"
        }
      },
      {
        "label": "Take the lamp and send the traveller back in darkness.",
        "kind": "selfish",
        "good": {
          "text": "strong light reveals the enemy before it sees you.",
          "effect": "Ruthless edge"
        },
        "bad": {
          "text": "cries from the passage behind fracture your concentration.",
          "effect": "Dismay"
        }
      }
    ]
  },
  {
    "id": "G12",
    "title": "The deserter at the fire",
    "pool": "general",
    "description": "A deserter warms both hands over a tiny fire. They know something of the force ahead and beg you not to take them back to their officers.",
    "choices": [
      {
        "label": "Offer safe passage in exchange for what they know.",
        "kind": "compassionate",
        "good": {
          "text": "their warning helps you prepare for the next fight.",
          "effect": "Resolve"
        },
        "bad": {
          "text": "fear has tangled their account, and the company prepares for the wrong threat.",
          "effect": "Doubt"
        }
      },
      {
        "label": "Demand their pay and force them to reveal the approach.",
        "kind": "selfish",
        "good": {
          "text": "their purse is heavy with saved wages.",
          "effect": "Large cache"
        },
        "bad": {
          "text": "they escape during the confrontation, leaving false directions that cost the company dearly.",
          "effect": "Party strain"
        }
      }
    ]
  },
  {
    "id": "G13",
    "title": "The porter and the medicine",
    "pool": "general",
    "description": "A porter struggles with a chest of medicine intended for a shelter above. Your own wounded heroes can smell the spirits through its seams.",
    "choices": [
      {
        "label": "Help carry the chest to a safer landing.",
        "kind": "compassionate",
        "good": {
          "text": "the porter opens a small travelling kit to treat your worst wound.",
          "effect": "Restore"
        },
        "bad": {
          "text": "a strap snaps and a hero is hurt catching the load.",
          "effect": "Wound"
        }
      },
      {
        "label": "Confiscate the medicine for your expedition.",
        "kind": "selfish",
        "good": {
          "text": "there is enough to treat the whole company.",
          "effect": "Feast"
        },
        "bad": {
          "text": "the porter's description of those waiting above turns the act into a bitter argument.",
          "effect": "Discord"
        }
      }
    ]
  },
  {
    "id": "G14",
    "title": "The raven's message",
    "pool": "general",
    "description": "A messenger raven is tangled in cord beside a fallen perch. A sealed message case glints on its leg.",
    "choices": [
      {
        "label": "Untangle the bird and let it finish its journey.",
        "kind": "compassionate",
        "good": {
          "text": "the case bears a recruiter’s token; its owner later honours your help.",
          "effect": "One contract favour"
        },
        "bad": {
          "text": "the frightened bird tears a hero's fingers before flying free.",
          "effect": "Wound"
        }
      },
      {
        "label": "Take the message case and keep its valuable seal.",
        "kind": "selfish",
        "good": {
          "text": "the seal is gold, and the case contains a travel purse.",
          "effect": "Large cache"
        },
        "bad": {
          "text": "the message is a plea for reinforcements from a familiar company. Its silence weighs on you.",
          "effect": "Dismay"
        }
      }
    ]
  },
  {
    "id": "G15",
    "title": "The burial crew",
    "pool": "general",
    "description": "Exhausted labourers have stopped beside a cart of bodies. Their foreman offers the last of their wages to anyone willing to help finish the work.",
    "choices": [
      {
        "label": "Help them finish without taking their wages.",
        "kind": "compassionate",
        "good": {
          "text": "their thanks and the completed work restore a sense of purpose.",
          "effect": "Resolve"
        },
        "bad": {
          "text": "the labour leaves the company too weary to fight cleanly.",
          "effect": "Hesitation"
        }
      },
      {
        "label": "Take their tools and force them to pay for their return.",
        "kind": "selfish",
        "good": {
          "text": "the foreman surrenders the remaining wages.",
          "effect": "Large cache"
        },
        "bad": {
          "text": "the workers resist and a hero takes a heavy blow in the struggle.",
          "effect": "Deep wound"
        }
      }
    ]
  },
  {
    "id": "G16",
    "title": "The shivering watch",
    "pool": "general",
    "description": "Two sentries from a scattered allied patrol huddle without cloaks. Their post overlooks the next approach, but neither can stop shaking.",
    "choices": [
      {
        "label": "Share blankets and help them hold their watch.",
        "kind": "compassionate",
        "good": {
          "text": "rested sentries signal a clear opening for your advance.",
          "effect": "Edge"
        },
        "bad": {
          "text": "the delay leaves your company cold and uncertain.",
          "effect": "Doubt"
        }
      },
      {
        "label": "Take their dry rations and order them to remain at the post.",
        "kind": "selfish",
        "good": {
          "text": "the food restores the company.",
          "effect": "Feast"
        },
        "bad": {
          "text": "the sentries abandon their post, and you walk into trouble while expecting their signal.",
          "effect": "Party strain"
        }
      }
    ]
  },
  {
    "id": "G17",
    "title": "The sheltered garden",
    "pool": "general",
    "description": "A hidden patch of medicinal roots grows beneath a broken skylight. Its keeper asks you to leave enough seed for the people who depend on it.",
    "choices": [
      {
        "label": "Help harvest only what the keeper can spare.",
        "kind": "compassionate",
        "good": {
          "text": "carefully prepared roots treat the company's worst wound.",
          "effect": "Restore"
        },
        "bad": {
          "text": "a concealed thorn tears through a hero's glove.",
          "effect": "Wound"
        }
      },
      {
        "label": "Uproot the whole bed before the keeper can stop you.",
        "kind": "selfish",
        "good": {
          "text": "you gather enough fresh medicine for everyone.",
          "effect": "Feast"
        },
        "bad": {
          "text": "hurried preparation mixes useful roots with an irritant, leaving the company weakened.",
          "effect": "Party strain"
        }
      }
    ]
  },
  {
    "id": "G18",
    "title": "The broken bridge",
    "pool": "general",
    "description": "A small caravan waits before a snapped bridge. The remaining planks would also make a quick walkway to a guarded supply alcove.",
    "choices": [
      {
        "label": "Use the planks to repair the caravan's crossing.",
        "kind": "compassionate",
        "good": {
          "text": "its master gives you a share of the trading silver.",
          "effect": "Small cache"
        },
        "bad": {
          "text": "a hero is injured setting the final support.",
          "effect": "Wound"
        }
      },
      {
        "label": "Take the planks and raid the supply alcove.",
        "kind": "selfish",
        "good": {
          "text": "the isolated stores contain a valuable pay chest.",
          "effect": "Large cache"
        },
        "bad": {
          "text": "the improvised walkway fails under the returning company.",
          "effect": "Party strain"
        }
      }
    ]
  },
  {
    "id": "G19",
    "title": "The smith's warning bell",
    "pool": "general",
    "description": "A smith has built a crude warning bell for the settlements above. The bronze fittings could also buy supplies for your company.",
    "choices": [
      {
        "label": "Help hang the bell where its warning will carry.",
        "kind": "compassionate",
        "good": {
          "text": "the smith balances your weapons before you leave.",
          "effect": "Edge"
        },
        "bad": {
          "text": "the bell sounds while you raise it, scattering the company into cover.",
          "effect": "Doubt"
        }
      },
      {
        "label": "Dismantle the bell and take the bronze.",
        "kind": "selfish",
        "good": {
          "text": "its fittings are worth a substantial sum.",
          "effect": "Large cache"
        },
        "bad": {
          "text": "the smith's condemnation divides the company over what you have become.",
          "effect": "Discord"
        }
      }
    ]
  },
  {
    "id": "G20",
    "title": "The ration ledger",
    "pool": "general",
    "description": "An abandoned depot holds sealed rations and a ledger allocating them to refugees. A quartermaster asks you to help move them before the enemy returns.",
    "choices": [
      {
        "label": "Help distribute the food as recorded.",
        "kind": "compassionate",
        "good": {
          "text": "grateful recipients point you toward willing recruits in town.",
          "effect": "One contract favour"
        },
        "bad": {
          "text": "confused names and missing sacks turn the distribution into a dispiriting quarrel.",
          "effect": "Doubt"
        }
      },
      {
        "label": "Seize the depot's paybox and leave the quartermaster to explain.",
        "kind": "selfish",
        "good": {
          "text": "you find the emergency payroll beneath the ration shelves.",
          "effect": "Large cache"
        },
        "bad": {
          "text": "the quartermaster sounds the alarm and a hero is badly hurt escaping the depot.",
          "effect": "Deep wound"
        }
      }
    ]
  },
  {
    "id": "A01",
    "title": "The prisoner in the cage",
    "pool": "assassins",
    "description": "A prisoner watches you through the bars of a cage. Someone has scraped every name from the cell door. You cannot tell whether they silenced a witness or confined a killer.",
    "choices": [
      {
        "label": "Open the cage.",
        "kind": "compassionate",
        "good": {
          "text": "the prisoner whispers the location of a hidden cache before vanishing into the passages.",
          "effect": "Small cache"
        },
        "bad": {
          "text": "maddened by captivity, the prisoner slashes at the hero opening the cage and flees.",
          "effect": "Wound"
        }
      },
      {
        "label": "Leave the cage locked and take the prisoner's concealed signet.",
        "kind": "selfish",
        "good": {
          "text": "the signet secures two introductions through a contract broker who asks no questions.",
          "effect": "Two contract favours"
        },
        "bad": {
          "text": "the prisoner's pleas follow you until the company can no longer bear to listen.",
          "effect": "Dismay"
        }
      }
    ]
  },
  {
    "id": "A02",
    "title": "The book of names",
    "pool": "assassins",
    "description": "A dying clerk guards a ledger naming the Guild's informants. Several names have been crossed out; the rest still live in the town above.",
    "choices": [
      {
        "label": "Take the ledger to warn those named.",
        "kind": "compassionate",
        "good": {
          "text": "one warned broker offers to find you a recruit.",
          "effect": "One contract favour"
        },
        "bad": {
          "text": "the scale of the Guild's reach leaves the company doubting every ally.",
          "effect": "Doubt"
        }
      },
      {
        "label": "Use the names to demand payment for your silence.",
        "kind": "selfish",
        "good": {
          "text": "frightened informants pay to keep their names concealed.",
          "effect": "Large cache"
        },
        "bad": {
          "text": "one turns the threat back on you, and an ambush leaves a hero badly injured.",
          "effect": "Deep wound"
        }
      }
    ]
  },
  {
    "id": "A03",
    "title": "The masked witness",
    "pool": "assassins",
    "description": "A masked witness waits at a concealed stair. They can identify a Guild officer, but only if someone escorts them beyond the next watch post.",
    "choices": [
      {
        "label": "Guide the witness to the stair's upper landing.",
        "kind": "compassionate",
        "good": {
          "text": "they describe the officer's habits and signals.",
          "effect": "Edge"
        },
        "bad": {
          "text": "a watcher recognises the witness and a hero is hurt covering their escape.",
          "effect": "Wound"
        }
      },
      {
        "label": "Take payment to abandon the witness at the rendezvous.",
        "kind": "selfish",
        "good": {
          "text": "the Guild's intermediary leaves a heavy purse and withdraws.",
          "effect": "Large cache"
        },
        "bad": {
          "text": "the rendezvous was meant to silence every witness, including you.",
          "effect": "Party strain"
        }
      }
    ]
  },
  {
    "id": "A04",
    "title": "The poisoner's apprentice",
    "pool": "assassins",
    "description": "An apprentice stands beside an open poison cabinet. They want to leave the Guild, but fear the master who has locked the workshop from outside.",
    "choices": [
      {
        "label": "Help the apprentice destroy the stock and escape.",
        "kind": "compassionate",
        "good": {
          "text": "they treat your worst wound with the workshop's antidotes and dressings.",
          "effect": "Restore"
        },
        "bad": {
          "text": "a cracked vial burns a hero's skin during the cleanup.",
          "effect": "Wound"
        }
      },
      {
        "label": "Force the apprentice to coat your blades before leaving them behind.",
        "kind": "selfish",
        "good": {
          "text": "the fresh preparation gives your attacks a vicious advantage.",
          "effect": "Ruthless edge"
        },
        "bad": {
          "text": "the hurried mixture fouls weapons and numbs hands instead.",
          "effect": "Discord"
        }
      }
    ]
  },
  {
    "id": "A05",
    "title": "The quiet door",
    "pool": "assassins",
    "description": "A Guild collector waits beside a shuttered room. Inside, a family is being held over a debt they could never repay. The collector offers you a share if you help him frighten them.",
    "choices": [
      {
        "label": "Break the collector's hold and show the family a way out.",
        "kind": "compassionate",
        "good": {
          "text": "their escape reminds the company what it is fighting for.",
          "effect": "Resolve"
        },
        "bad": {
          "text": "the collector gets away with a hero's purse during the struggle.",
          "effect": "Lost purse"
        }
      },
      {
        "label": "Help collect the debt in exchange for your share.",
        "kind": "selfish",
        "good": {
          "text": "the collector divides the seized valuables as promised.",
          "effect": "Large cache"
        },
        "bad": {
          "text": "the family hands over a child's keepsake; the company refuses to celebrate the haul.",
          "effect": "Dismay"
        }
      }
    ]
  },
  {
    "id": "U01",
    "title": "The stolen headstones",
    "pool": "undead",
    "description": "A mason guards a heap of headstones torn from their graves. A necromancer has been using the names to call the dead from the earth.",
    "choices": [
      {
        "label": "Help return the names to their graves.",
        "kind": "compassionate",
        "good": {
          "text": "restoring the markers quiets the company's fear.",
          "effect": "Resolve"
        },
        "bad": {
          "text": "something stirs beneath the disturbed soil and wounds a hero before settling.",
          "effect": "Wound"
        }
      },
      {
        "label": "Break the markers and take their silver nameplates.",
        "kind": "selfish",
        "good": {
          "text": "the collected plates carry considerable value.",
          "effect": "Large cache"
        },
        "bad": {
          "text": "hearing the shattered names whispered beneath your feet sends the company stumbling away.",
          "effect": "Dismay"
        }
      }
    ]
  },
  {
    "id": "U02",
    "title": "The undertaker's bell",
    "pool": "undead",
    "description": "An undertaker rings a handbell to keep walking corpses from a room of survivors. Each peal draws the dead toward the sound, and the undertaker can barely raise an arm.",
    "choices": [
      {
        "label": "Take a turn at the bell while the survivors leave.",
        "kind": "compassionate",
        "good": {
          "text": "the undertaker binds your worst wound before following them.",
          "effect": "Restore"
        },
        "bad": {
          "text": "a corpse reaches the doorway and catches the hero holding it.",
          "effect": "Wound"
        }
      },
      {
        "label": "Take the undertaker's payment box and leave with the bell.",
        "kind": "selfish",
        "good": {
          "text": "funeral fees and emergency offerings fill the box.",
          "effect": "Large cache"
        },
        "bad": {
          "text": "the sudden silence behind you makes the company understand exactly what it has done.",
          "effect": "Dismay"
        }
      }
    ]
  },
  {
    "id": "U03",
    "title": "The bone choir",
    "pool": "undead",
    "description": "Bound spirits sing through a rack of carved bones. A living caretaker claims the song steadies the dead, but the voices are begging to stop.",
    "choices": [
      {
        "label": "Break the bindings and release the voices.",
        "kind": "compassionate",
        "good": {
          "text": "one spirit warns you where the next ambush waits.",
          "effect": "Edge"
        },
        "bad": {
          "text": "the final cry leaves the company shaken.",
          "effect": "Doubt"
        }
      },
      {
        "label": "Command the choir to sing strength into your weapons.",
        "kind": "selfish",
        "good": {
          "text": "the stolen song lends your attacks unnatural force.",
          "effect": "Ruthless edge"
        },
        "bad": {
          "text": "the discord overwhelms the company and ruins its coordination.",
          "effect": "Discord"
        }
      }
    ]
  },
  {
    "id": "U04",
    "title": "The grave watcher's oath",
    "pool": "undead",
    "description": "A grave watcher stands before a sealed burial vault. They have orders never to leave, though their food is gone and the silver fittings would buy a way out.",
    "choices": [
      {
        "label": "Help relieve the watch and leave the vault sealed.",
        "kind": "compassionate",
        "good": {
          "text": "the watcher describes a safe approach through the crypts.",
          "effect": "Edge"
        },
        "bad": {
          "text": "the company loses precious confidence debating which passages can be trusted.",
          "effect": "Doubt"
        }
      },
      {
        "label": "Break the seal and take the burial silver.",
        "kind": "selfish",
        "good": {
          "text": "the untouched offerings fill your packs.",
          "effect": "Large cache"
        },
        "bad": {
          "text": "the opened vault exhales a grave-cold wind that drains the company's strength.",
          "effect": "Party strain"
        }
      }
    ]
  },
  {
    "id": "U05",
    "title": "The widow's lantern",
    "pool": "undead",
    "description": "A widow searches the crypts with a lantern made from her husband's old watch light. It burns blue whenever a restless spirit approaches.",
    "choices": [
      {
        "label": "Help her find his resting place.",
        "kind": "compassionate",
        "good": {
          "text": "together you quiet the spirit, and her thanks steadies the company.",
          "effect": "Resolve"
        },
        "bad": {
          "text": "the search ends at an empty coffin; the uncertainty weighs on everyone.",
          "effect": "Doubt"
        }
      },
      {
        "label": "Take the lantern and leave her to search without it.",
        "kind": "selfish",
        "good": {
          "text": "the blue flame reveals threats before they reach you.",
          "effect": "Fervour"
        },
        "bad": {
          "text": "the lamp goes dark, and her distant calls break your concentration.",
          "effect": "Dismay"
        }
      }
    ]
  },
  {
    "id": "D01",
    "title": "The chained fiend",
    "pool": "demons",
    "description": "A small fiend hangs in a circle of chain. It offers to reveal stolen wealth if you release the captives whose fear has been feeding the circle; a cultist begs you to take the easier bargain instead.",
    "choices": [
      {
        "label": "Break the captives' bonds and deny the circle its fear.",
        "kind": "compassionate",
        "good": {
          "text": "a freed captive points out the cultist's hidden offering purse.",
          "effect": "Small cache"
        },
        "bad": {
          "text": "the collapsing circle lashes the hero breaking its last chain.",
          "effect": "Wound"
        }
      },
      {
        "label": "Leave the captives bound and demand the fiend's greater hoard.",
        "kind": "selfish",
        "good": {
          "text": "the fiend honours its narrow promise and reveals a rich cache.",
          "effect": "Large cache"
        },
        "bad": {
          "text": "it feeds on the company's willingness and leaves you hollow with dread.",
          "effect": "Dismay"
        }
      }
    ]
  },
  {
    "id": "D02",
    "title": "The ember altar",
    "pool": "demons",
    "description": "A dying altar holds heat stolen from the people sheltering nearby. A votive keeper begs you to break its channel before the cold takes them.",
    "choices": [
      {
        "label": "Return the stolen warmth to the shelter.",
        "kind": "compassionate",
        "good": {
          "text": "the released heat reaches your wounded heroes as well.",
          "effect": "Shared care"
        },
        "bad": {
          "text": "a burst of flame catches the hero opening the channel.",
          "effect": "Wound"
        }
      },
      {
        "label": "Draw the remaining warmth into your weapons.",
        "kind": "selfish",
        "good": {
          "text": "banked embers burn along every blade and spell.",
          "effect": "Ruthless edge"
        },
        "bad": {
          "text": "the heat turns inward and sears the company.",
          "effect": "Party strain"
        }
      }
    ]
  },
  {
    "id": "D03",
    "title": "The false pilgrim",
    "pool": "demons",
    "description": "A pilgrim is caught with a cult sigil beneath their sleeve. They insist they joined only to find a missing sibling and offer names in exchange for protection.",
    "choices": [
      {
        "label": "Hear their account and guide them out.",
        "kind": "compassionate",
        "good": {
          "text": "their description of the cult's signals prepares you for the next fight.",
          "effect": "Resolve"
        },
        "bad": {
          "text": "their frightened account contradicts itself, leaving the company uncertain.",
          "effect": "Doubt"
        }
      },
      {
        "label": "Take their offering purse and send them back as a decoy.",
        "kind": "selfish",
        "good": {
          "text": "the purse holds several days of collected offerings.",
          "effect": "Large cache"
        },
        "bad": {
          "text": "the cult sees through the deception and the company is hurt getting away.",
          "effect": "Party strain"
        }
      }
    ]
  },
  {
    "id": "D04",
    "title": "The living seal",
    "pool": "demons",
    "description": "A captive holds both hands against a burning seal. Removing them without care will open the ward; the cult has left their valuables on the far side as bait.",
    "choices": [
      {
        "label": "Replace the captive's hold with a stone brace.",
        "kind": "compassionate",
        "good": {
          "text": "the rescue gives the company renewed purpose.",
          "effect": "Resolve"
        },
        "bad": {
          "text": "the brace slips and the ward burns a hero before settling.",
          "effect": "Wound"
        }
      },
      {
        "label": "Leave the captive in place and cross for the valuables.",
        "kind": "selfish",
        "good": {
          "text": "the bait includes an untouched payment chest.",
          "effect": "Large cache"
        },
        "bad": {
          "text": "the captive's strength fails while you cross, and the seal's backlash catches everyone.",
          "effect": "Party strain"
        }
      }
    ]
  },
  {
    "id": "D05",
    "title": "The infernal tithe",
    "pool": "demons",
    "description": "A cult clerk sorts the possessions of people taken for sacrifice. Some captives are still alive behind a barred arch; the clerk offers you the lists and the keys to the tithe chest.",
    "choices": [
      {
        "label": "Use the lists and keys to free the captives.",
        "kind": "compassionate",
        "good": {
          "text": "a freed broker promises to send a willing recruit your way.",
          "effect": "One contract favour"
        },
        "bad": {
          "text": "the rescue forces a hurried retreat through a narrow, dangerous passage.",
          "effect": "Wound"
        }
      },
      {
        "label": "Take the tithe chest and leave the captives listed as paid.",
        "kind": "selfish",
        "good": {
          "text": "the chest contains the valuables of an entire procession.",
          "effect": "Large cache"
        },
        "bad": {
          "text": "the names in the ledger become a bitter argument the company cannot put aside.",
          "effect": "Discord"
        }
      }
    ]
  },
  {
    "id": "O01",
    "title": "The white rag",
    "pool": "orcs",
    "description": "An orc carrying a white rag leads several wounded noncombatants toward a blocked stair. The invaders' insignia have been torn from their clothing.",
    "choices": [
      {
        "label": "Clear a passage and honour their truce.",
        "kind": "compassionate",
        "good": {
          "text": "they warn you of the warband's next patrol.",
          "effect": "Edge"
        },
        "bad": {
          "text": "the rubble shifts as you work and injures a hero.",
          "effect": "Wound"
        }
      },
      {
        "label": "Take their supplies and drive them back below.",
        "kind": "selfish",
        "good": {
          "text": "the seized food and dressings restore your company.",
          "effect": "Feast"
        },
        "bad": {
          "text": "a frightened struggle leaves a hero badly hurt.",
          "effect": "Deep wound"
        }
      }
    ]
  },
  {
    "id": "O02",
    "title": "The goblin porter",
    "pool": "orcs",
    "description": "A goblin porter has collapsed beneath a load of the warband's plunder. They offer to show you an unguarded route if you let them leave with a single bundle of their own.",
    "choices": [
      {
        "label": "Lift the load and let the porter choose their bundle.",
        "kind": "compassionate",
        "good": {
          "text": "the promised route gives you the next fight's first advantage.",
          "effect": "Resolve"
        },
        "bad": {
          "text": "the route has changed since the porter last passed, leaving you uncertain and delayed.",
          "effect": "Doubt"
        }
      },
      {
        "label": "Take every bundle and force the porter away empty-handed.",
        "kind": "selfish",
        "good": {
          "text": "the plunder includes a substantial coin purse.",
          "effect": "Large cache"
        },
        "bad": {
          "text": "the abandoned porter raises an alarm and you are hurt escaping.",
          "effect": "Party strain"
        }
      }
    ]
  },
  {
    "id": "O03",
    "title": "The ancestral drum",
    "pool": "orcs",
    "description": "An old orc guards a drum used for mourning, not marching. Its metal fittings are valuable; its slow rhythm has gathered scattered civilians into hiding.",
    "choices": [
      {
        "label": "Help conceal the drum and those following its sound.",
        "kind": "compassionate",
        "good": {
          "text": "the elder teaches you a rhythm that helps the company hold together.",
          "effect": "Resolve"
        },
        "bad": {
          "text": "the weight of the mourning makes your own losses harder to bear.",
          "effect": "Doubt"
        }
      },
      {
        "label": "Take the drum and turn its rhythm into a battle signal.",
        "kind": "selfish",
        "good": {
          "text": "the stolen cadence drives the company forward with fierce unity.",
          "effect": "Fervour"
        },
        "bad": {
          "text": "the unfamiliar signal tangles your orders and draws the warband's attention.",
          "effect": "Discord"
        }
      }
    ]
  },
  {
    "id": "O04",
    "title": "The winter stores",
    "pool": "orcs",
    "description": "A requisition mark has been painted over a civilian granary. An orc caretaker begs you to leave enough food for those who will remain after either army has gone.",
    "choices": [
      {
        "label": "Help hide the stores from the warband.",
        "kind": "compassionate",
        "good": {
          "text": "the caretaker shares a meal the granary can afford.",
          "effect": "Shared care"
        },
        "bad": {
          "text": "the work leaves you tired and late for the next approach.",
          "effect": "Hesitation"
        }
      },
      {
        "label": "Seize the best provisions for your own expedition.",
        "kind": "selfish",
        "good": {
          "text": "good food restores the whole company.",
          "effect": "Feast"
        },
        "bad": {
          "text": "the caretaker's resistance turns the seizure into a scuffle that injures a hero badly.",
          "effect": "Deep wound"
        }
      }
    ]
  },
  {
    "id": "O05",
    "title": "The captured scout",
    "pool": "orcs",
    "description": "A young warband scout lies bound beside an abandoned guard post. They know where the next patrol turns and beg not to be handed back to the officers who sent them here.",
    "choices": [
      {
        "label": "Cut the bonds and let the scout leave.",
        "kind": "compassionate",
        "good": {
          "text": "gratitude buys an accurate account of the patrol route.",
          "effect": "Edge"
        },
        "bad": {
          "text": "the scout's frightened warning sends you watching the wrong passage.",
          "effect": "Hesitation"
        }
      },
      {
        "label": "Force the scout ahead to draw the patrol away.",
        "kind": "selfish",
        "good": {
          "text": "the diversion gives your attacks a decisive opening.",
          "effect": "Ruthless edge"
        },
        "bad": {
          "text": "the scout breaks free and warns the patrol; a hero takes the worst of the resulting skirmish.",
          "effect": "Deep wound"
        }
      }
    ]
  }
];
