# Vaultbound — expedition events and chronicle draft

Implemented event catalogue. Runtime data is built with `node scripts/build-event-catalogue.mjs`; small native SVG emblems are built with `node scripts/build-event-art.mjs`. The current campaigns are Undead Uprising, Demonic Invasion, Assassins’ Guild and Orc Warband: 20 general encounters and five exclusive encounters for each campaign, 40 uncertain encounters in total, plus two guaranteed windfalls.

## Shared rules

- At campaign creation, choose five general encounters, three belonging to the active campaign, and the two guaranteed windfalls, without replacement. Shuffle their order and pre-generate their outcome rolls. Encounters are independent, so every order makes sense.
- Schedule the first after 2–5 total cleared floors; each subsequent event follows 2–3 further clears. The counter persists across days and counts repeated floors. Ten events are scheduled, but some campaigns will end before all ten are seen.
- Resolve an encounter after floor rewards and before Continue/Flee. The outcome screen returns the player to that decision. Combat and the next floor do not start behind it. Completing the final day can still trigger a scheduled event after a floor clear.
- Take the outlook from that morning’s town text and keep it fixed all day. Progress, clean retreat and victory mean hopeful; no progress and costly setback mean bleak. Day one is neutral: use the hopeful odds until an expedition has established an outlook.
- Compassionate choices have a 66% favourable outcome in either outlook. Selfish choices have 34% favourable odds when hopeful and 66% when bleak. Opening-day and victory outlooks use the hopeful odds.
- Selfish choices generally offer larger rewards and harsher risks. In bleak times they can be mechanically preferable; no hidden punishment is added to cancel that temptation.
- The player sees the situation, both choices, and their possible mechanical rewards and costs. Exact odds remain hidden. The compassionate/selfish classifications below are authoring notes; the buttons use the written action, not a morality label.
- Chance reflects the world's response, not a moral verdict. A victim can be grateful even when helping them goes badly. The result must not invent proof that every selfish act was justified.

## Shared effects and initial balance

These are starting values for playtesting, not claims of equal expected value. Gold, health and Command have different value depending on the party and situation. A favourable selfish outcome should be tempting, while the favourable compassionate outcome remains useful.

**G** is a small gold unit: 1 on days 1–4, 2 on days 5–8, and 3 on days 9–10. This keeps small caches relevant without giving away building levels.

| Effect | Exact meaning |
|---|---|
| Small cache | Gain 2G gold. |
| Large cache | Gain 4G gold. |
| Lost purse | Lose G gold, capped at the gold carried; never go into debt. |
| Restore | Heal one living expedition hero by 25% of maximum HP, capped at maximum. Choose the hero missing the largest proportion of HP; break ties randomly. |
| Shared care | Heal every living expedition hero by 10% of maximum HP. |
| Feast | Heal every living expedition hero by 20% of maximum HP. |
| Wound | One randomly chosen living front-row hero loses 15% of maximum HP from current HP. Fall back to any living hero if there is no front row. |
| Deep wound | As Wound, but 25% of maximum HP. |
| Party strain | Every living expedition hero loses 10% of maximum HP from current HP. |
| Resolve | Start the next battle with 65 Command instead of the normal 50. |
| Fervour | Start the next battle with 80 Command. |
| Doubt | Start the next battle with 35 Command. |
| Dismay | Start the next battle with 0 Command. |
| Edge | All heroes deal 5% more attack damage for the next battle. |
| Ruthless edge | All heroes deal 10% more attack damage for the next battle. |
| Hesitation | All heroes deal 5% less attack damage for the next battle. |
| Discord | All heroes deal 10% less attack damage for the next battle. |
| One contract favour | One additional free reroll next day. |
| Two contract favours | Two additional free rerolls next day. |

Health losses are rounded up, healing rounded to the nearest whole HP with a minimum of 1 HP when any healing is possible. Event damage is nonlethal, leaving at least 1 HP. Only living expedition heroes are affected; reserves are excluded. No event kills, permanently removes a hero, resurrects a hero, grants a permanent level or requires a particular class.

If a favourable healing outcome would restore no HP because everyone is healthy, award a small cache instead of Restore/Shared care, or a large cache instead of Feast. State this conversion in the outcome and chronicle. If a Lost purse outcome occurs with no gold, apply Doubt instead and describe the failed theft or dispute as a loss of confidence. Preview these fallbacks before the choice. There are no choices requiring an upfront payment, so neither button becomes unavailable when the player is poor.

Next-battle effects survive retreat and the day change until the next actual battle starts, then expire at that battle's end. They are applied after the normal floor reset. Command changes affect starting Command only, not maximum or gain rate. Attack damage changes stack multiplicatively with existing town/building effects and affect hero attacks, including mage attacks; they do not change healing, bard buffs, commands or health. Fleeing cannot erase a consequence.

Event contract favours stack with Crossing and each other, preserve the normal paid 1g/2g/3g sequence and expire at the end of the following day. Because there is no next recruitment on day ten, replace one/two favours with a small/large cache, and write the result as payment for the information or introduction instead. Show the day-ten variant before choosing.

Multiple pending effects of the same duration should not normally coincide because events require further floor clears. Any future exception needs an explicit stacking rule before release. Contract favours are the deliberate exception and add together.

## Chronicle contract

Record each event's day, displayed floor, cumulative clear count, title, exact choice and resolved outcome. Record it once, including mechanical consequences and any fallback. Keep the readable version compact:

> Day 4 · Floor 3 — The prisoner in the cage. We opened the cage. He revealed a hidden cache before disappearing into the tunnels. Gained 2 gold.

A next-battle consequence is recorded when acquired and when it takes effect. A contract favour is recorded when earned and when consumed or expired. Record the player's action as written; do not call it good or evil, and do not turn a bad roll into an accusation against the player. The chronicle retains the choice even if its benefit expires unused.

---

## General encounters — 20

### G01 · The wounded courier

A courier lies against a milestone. One hand presses a bleeding wound; the other holds a sealed dispatch. Footsteps echo beyond the bend.

- **Compassionate — Bind the wound and conceal the courier.** Favourable: the courier marks a sheltered cache on your map before slipping away. **Small cache.** Unfavourable: the patrol reaches the bend before the bandage is tied; a hero is hurt getting the courier into cover. **Wound.**
- **Selfish — Take the dispatch and leave the courier behind.** Favourable: a payment warrant inside leads to a much larger cache. **Large cache.** Unfavourable: your company recognises the seal of people still waiting for this message. Nobody will meet your eyes. **Dismay.**

### G02 · The last clean well

A family has drawn the last clear bucket from a well fouled by the fighting. Your company has been drinking from its own dwindling skins.

- **Compassionate — Help the family draw water from deeper down.** Favourable: together you reach clean water, enough to share. **Shared care.** Unfavourable: the rope breaks and a hero is dragged against the stone rim. **Wound.**
- **Selfish — Claim the clean bucket for the company.** Favourable: the water restores the whole party. The family watches you drink. **Feast.** Unfavourable: someone refuses their share; the quarrel follows you away from the well. **Discord.**

### G03 · The coins of the dead

Fresh graves line a passage. Coins have been set on the shrouds, and something has disturbed the earth around them.

- **Compassionate — Rebury the exposed bodies.** Favourable: finishing the work gives the company a moment of purpose. **Resolve.** Unfavourable: exhaustion and the smell of the graves follow you back into the passage. **Doubt.**
- **Selfish — Strip the shrouds of their coins.** Favourable: the dead carried more than their burial offerings. **Large cache.** Unfavourable: a familiar regiment's badge hangs beneath one shroud. The company leaves in silence. **Dismay.**

### G04 · Refugees on the ledge

Refugees cling to a narrow shelf above a broken stair. A rope bridge blocks the way to their abandoned baggage.

- **Compassionate — Secure a rope and bring them across.** Favourable: one survivor is a contract broker and promises an introduction in town. **One contract favour.** Unfavourable: the last crossing pulls a hero into the rock face. **Wound.**
- **Selfish — Cut down their baggage and leave them stranded.** Favourable: the packs contain the valuables they hoped to carry to safety. **Large cache.** Unfavourable: the falling packs bring part of the stair down on the company. **Party strain.**

### G05 · The abandoned merchant's chest

A locked chest sits beneath a chalked merchant's mark. A note asks whoever finds it to leave it for the owner's return.

- **Compassionate — Hide the chest and mark a safe route to it.** Favourable: the returning owner catches up with you and offers a reward. **Small cache.** Unfavourable: you find only an empty hiding place when the owner returns; the dispute costs time and trust. **Doubt.**
- **Selfish — Break the lock and divide the contents.** Favourable: the lining conceals a second purse. **Large cache.** Unfavourable: a spring blade catches the hero levering open the lid. **Deep wound.**

### G06 · The trapped scavenger

A scavenger is pinned beneath a beam, within reach of a satchel full of salvage. The ceiling sheds dust with every breath.

- **Compassionate — Lift the beam together.** Favourable: the scavenger shares a safe approach to the next chamber. **Edge.** Unfavourable: the beam shifts and crushes a hero's hand before everyone pulls free. **Wound.**
- **Selfish — Take the satchel and leave the beam where it lies.** Favourable: the salvage includes a pouch of saleable fittings. **Large cache.** Unfavourable: the snagged satchel pulls the remaining supports loose as you drag it away. **Party strain.**

### G07 · The fever shelter

Several travellers lie beneath patched blankets. Their attendant asks for help carrying clean water from a cistern across the chamber.

- **Compassionate — Fetch the water and tend the sick.** Favourable: the attendant treats the company's worst wound in return. **Restore.** Unfavourable: the work leaves you shaken by how little separates the sick from the dying. **Hesitation.**
- **Selfish — Take the attendant's unused supplies.** Favourable: the stolen dressings and tonic restore the company. **Feast.** Unfavourable: the travellers' cries follow you down the passage; the company cannot agree to stop or return. **Dismay.**

### G08 · The cracked wayside shrine

A small shrine has split from floor to altar. A votive chain is caught beneath its stone saint, and a lamp still burns beside it.

- **Compassionate — Raise the statue and relight the shrine.** Favourable: the familiar rite steadies the company. **Resolve.** Unfavourable: the cracked stone shifts while a hero supports it. **Wound.**
- **Selfish — Pry out the votive chain.** Favourable: the links are solid silver. **Large cache.** Unfavourable: the statue topples and the company scrambles through falling stone. **Party strain.**

### G09 · The fallen company

Another expedition lies dead around a cold camp. A journal names the people waiting for them, beside a careful inventory of their belongings.

- **Compassionate — Gather their names and leave their belongings for recovery.** Favourable: the final pages describe the enemy's movements ahead. **Edge.** Unfavourable: reading their last days saps the company's confidence. **Doubt.**
- **Selfish — Strip the camp and destroy the inventory.** Favourable: coin and trade goods fill your packs. **Large cache.** Unfavourable: someone finds a letter tucked beneath a stolen keepsake. Your next orders meet only silence. **Dismay.**

### G10 · The frightened tollkeeper

An old tollkeeper has barricaded a narrow gate. He has orders to admit nobody, but his shaking hands can barely hold the key.

- **Compassionate — Persuade him to open the gate and leave his post.** Favourable: he draws the next chamber's patrol route before departing. **Edge.** Unfavourable: the long negotiation gives the enemy time to change its watch. **Hesitation.**
- **Selfish — Threaten him into handing over the gatehouse purse.** Favourable: he gives you the week's collections. **Large cache.** Unfavourable: his panicked cry draws a response from beyond the gate, and the retreat leaves a hero badly hurt. **Deep wound.**

### G11 · The last lamp

You find a lost traveller beside a nearly spent lamp. There is oil enough for one route: their way back or your way deeper.

- **Compassionate — Give the traveller the oil.** Favourable: they leave you an accurate sketch of the passages they escaped. **Edge.** Unfavourable: without the extra light, your company struggles to find its bearings. **Hesitation.**
- **Selfish — Take the lamp and send the traveller back in darkness.** Favourable: strong light reveals the enemy before it sees you. **Ruthless edge.** Unfavourable: cries from the passage behind fracture your concentration. **Dismay.**

### G12 · The deserter at the fire

A deserter warms both hands over a tiny fire. They know something of the force ahead and beg you not to take them back to their officers.

- **Compassionate — Offer safe passage in exchange for what they know.** Favourable: their warning helps you prepare for the next fight. **Resolve.** Unfavourable: fear has tangled their account, and the company prepares for the wrong threat. **Doubt.**
- **Selfish — Demand their pay and force them to reveal the approach.** Favourable: their purse is heavy with saved wages. **Large cache.** Unfavourable: they escape during the confrontation, leaving false directions that cost the company dearly. **Party strain.**

### G13 · The porter and the medicine

A porter struggles with a chest of medicine intended for a shelter above. Your own wounded heroes can smell the spirits through its seams.

- **Compassionate — Help carry the chest to a safer landing.** Favourable: the porter opens a small travelling kit to treat your worst wound. **Restore.** Unfavourable: a strap snaps and a hero is hurt catching the load. **Wound.**
- **Selfish — Confiscate the medicine for your expedition.** Favourable: there is enough to treat the whole company. **Feast.** Unfavourable: the porter's description of those waiting above turns the act into a bitter argument. **Discord.**

### G14 · The raven's message

A messenger raven is tangled in cord beside a fallen perch. A sealed message case glints on its leg.

- **Compassionate — Untangle the bird and let it finish its journey.** Favourable: the case bears a recruiter’s token; its owner later honours your help. **One contract favour.** Unfavourable: the frightened bird tears a hero's fingers before flying free. **Wound.**
- **Selfish — Take the message case and keep its valuable seal.** Favourable: the seal is gold, and the case contains a travel purse. **Large cache.** Unfavourable: the message is a plea for reinforcements from a familiar company. Its silence weighs on you. **Dismay.**

### G15 · The burial crew

Exhausted labourers have stopped beside a cart of bodies. Their foreman offers the last of their wages to anyone willing to help finish the work.

- **Compassionate — Help them finish without taking their wages.** Favourable: their thanks and the completed work restore a sense of purpose. **Resolve.** Unfavourable: the labour leaves the company too weary to fight cleanly. **Hesitation.**
- **Selfish — Take their tools and force them to pay for their return.** Favourable: the foreman surrenders the remaining wages. **Large cache.** Unfavourable: the workers resist and a hero takes a heavy blow in the struggle. **Deep wound.**

### G16 · The shivering watch

Two sentries from a scattered allied patrol huddle without cloaks. Their post overlooks the next approach, but neither can stop shaking.

- **Compassionate — Share blankets and help them hold their watch.** Favourable: rested sentries signal a clear opening for your advance. **Edge.** Unfavourable: the delay leaves your company cold and uncertain. **Doubt.**
- **Selfish — Take their dry rations and order them to remain at the post.** Favourable: the food restores the company. **Feast.** Unfavourable: the sentries abandon their post, and you walk into trouble while expecting their signal. **Party strain.**

### G17 · The sheltered garden

A hidden patch of medicinal roots grows beneath a broken skylight. Its keeper asks you to leave enough seed for the people who depend on it.

- **Compassionate — Help harvest only what the keeper can spare.** Favourable: carefully prepared roots treat the company's worst wound. **Restore.** Unfavourable: a concealed thorn tears through a hero's glove. **Wound.**
- **Selfish — Uproot the whole bed before the keeper can stop you.** Favourable: you gather enough fresh medicine for everyone. **Feast.** Unfavourable: hurried preparation mixes useful roots with an irritant, leaving the company weakened. **Party strain.**

### G18 · The broken bridge

A small caravan waits before a snapped bridge. The remaining planks would also make a quick walkway to a guarded supply alcove.

- **Compassionate — Use the planks to repair the caravan's crossing.** Favourable: its master gives you a share of the trading silver. **Small cache.** Unfavourable: a hero is injured setting the final support. **Wound.**
- **Selfish — Take the planks and raid the supply alcove.** Favourable: the isolated stores contain a valuable pay chest. **Large cache.** Unfavourable: the improvised walkway fails under the returning company. **Party strain.**

### G19 · The smith's warning bell

A smith has built a crude warning bell for the settlements above. The bronze fittings could also buy supplies for your company.

- **Compassionate — Help hang the bell where its warning will carry.** Favourable: the smith balances your weapons before you leave. **Edge.** Unfavourable: the bell sounds while you raise it, scattering the company into cover. **Doubt.**
- **Selfish — Dismantle the bell and take the bronze.** Favourable: its fittings are worth a substantial sum. **Large cache.** Unfavourable: the smith's condemnation divides the company over what you have become. **Discord.**

### G20 · The ration ledger

An abandoned depot holds sealed rations and a ledger allocating them to refugees. A quartermaster asks you to help move them before the enemy returns.

- **Compassionate — Help distribute the food as recorded.** Favourable: grateful recipients point you toward willing recruits in town. **One contract favour.** Unfavourable: confused names and missing sacks turn the distribution into a dispiriting quarrel. **Doubt.**
- **Selfish — Seize the depot's paybox and leave the quartermaster to explain.** Favourable: you find the emergency payroll beneath the ration shelves. **Large cache.** Unfavourable: the quartermaster sounds the alarm and a hero is badly hurt escaping the depot. **Deep wound.**

---

## Assassins’ Guild — five exclusive encounters

The enemy organisation is the Assassins’ Guild. It is distinct from the player's Thieves’ Guild building. These encounters concern captivity, secrecy, informants and coercion; they do not require the player to have a Thief.

### A01 · The prisoner in the cage

A prisoner watches you through the bars of a cage. Someone has scraped every name from the cell door. You cannot tell whether they silenced a witness or confined a killer.

- **Compassionate — Open the cage.** Favourable: the prisoner whispers the location of a hidden cache before vanishing into the passages. **Small cache.** Unfavourable: maddened by captivity, the prisoner slashes at the hero opening the cage and flees. **Wound.**
- **Selfish — Leave the cage locked and take the prisoner's concealed signet.** Favourable: the signet secures two introductions through a contract broker who asks no questions. **Two contract favours.** Unfavourable: the prisoner's pleas follow you until the company can no longer bear to listen. **Dismay.**

### A02 · The book of names

A dying clerk guards a ledger naming the Guild's informants. Several names have been crossed out; the rest still live in the town above.

- **Compassionate — Take the ledger to warn those named.** Favourable: one warned broker offers to find you a recruit. **One contract favour.** Unfavourable: the scale of the Guild's reach leaves the company doubting every ally. **Doubt.**
- **Selfish — Use the names to demand payment for your silence.** Favourable: frightened informants pay to keep their names concealed. **Large cache.** Unfavourable: one turns the threat back on you, and an ambush leaves a hero badly injured. **Deep wound.**

### A03 · The masked witness

A masked witness waits at a concealed stair. They can identify a Guild officer, but only if someone escorts them beyond the next watch post.

- **Compassionate — Guide the witness to the stair's upper landing.** Favourable: they describe the officer's habits and signals. **Edge.** Unfavourable: a watcher recognises the witness and a hero is hurt covering their escape. **Wound.**
- **Selfish — Take payment to abandon the witness at the rendezvous.** Favourable: the Guild's intermediary leaves a heavy purse and withdraws. **Large cache.** Unfavourable: the rendezvous was meant to silence every witness, including you. **Party strain.**

### A04 · The poisoner's apprentice

An apprentice stands beside an open poison cabinet. They want to leave the Guild, but fear the master who has locked the workshop from outside.

- **Compassionate — Help the apprentice destroy the stock and escape.** Favourable: they treat your worst wound with the workshop's antidotes and dressings. **Restore.** Unfavourable: a cracked vial burns a hero's skin during the cleanup. **Wound.**
- **Selfish — Force the apprentice to coat your blades before leaving them behind.** Favourable: the fresh preparation gives your attacks a vicious advantage. **Ruthless edge.** Unfavourable: the hurried mixture fouls weapons and numbs hands instead. **Discord.**

### A05 · The quiet door

A Guild collector waits beside a shuttered room. Inside, a family is being held over a debt they could never repay. The collector offers you a share if you help him frighten them.

- **Compassionate — Break the collector's hold and show the family a way out.** Favourable: their escape reminds the company what it is fighting for. **Resolve.** Unfavourable: the collector gets away with a hero's purse during the struggle. **Lost purse.**
- **Selfish — Help collect the debt in exchange for your share.** Favourable: the collector divides the seized valuables as promised. **Large cache.** Unfavourable: the family hands over a child's keepsake; the company refuses to celebrate the haul. **Dismay.**

---

## Undead Uprising — five exclusive encounters

These encounters concern names, burial, grief and the use of the dead. None grants resurrection or assumes that a named boss has already been encountered.

### U01 · The stolen headstones

A mason guards a heap of headstones torn from their graves. A necromancer has been using the names to call the dead from the earth.

- **Compassionate — Help return the names to their graves.** Favourable: restoring the markers quiets the company's fear. **Resolve.** Unfavourable: something stirs beneath the disturbed soil and wounds a hero before settling. **Wound.**
- **Selfish — Break the markers and take their silver nameplates.** Favourable: the collected plates carry considerable value. **Large cache.** Unfavourable: hearing the shattered names whispered beneath your feet sends the company stumbling away. **Dismay.**

### U02 · The undertaker's bell

An undertaker rings a handbell to keep walking corpses from a room of survivors. Each peal draws the dead toward the sound, and the undertaker can barely raise an arm.

- **Compassionate — Take a turn at the bell while the survivors leave.** Favourable: the undertaker binds your worst wound before following them. **Restore.** Unfavourable: a corpse reaches the doorway and catches the hero holding it. **Wound.**
- **Selfish — Take the undertaker's payment box and leave with the bell.** Favourable: funeral fees and emergency offerings fill the box. **Large cache.** Unfavourable: the sudden silence behind you makes the company understand exactly what it has done. **Dismay.**

### U03 · The bone choir

Bound spirits sing through a rack of carved bones. A living caretaker claims the song steadies the dead, but the voices are begging to stop.

- **Compassionate — Break the bindings and release the voices.** Favourable: one spirit warns you where the next ambush waits. **Edge.** Unfavourable: the final cry leaves the company shaken. **Doubt.**
- **Selfish — Command the choir to sing strength into your weapons.** Favourable: the stolen song lends your attacks unnatural force. **Ruthless edge.** Unfavourable: the discord overwhelms the company and ruins its coordination. **Discord.**

### U04 · The grave watcher's oath

A grave watcher stands before a sealed burial vault. They have orders never to leave, though their food is gone and the silver fittings would buy a way out.

- **Compassionate — Help relieve the watch and leave the vault sealed.** Favourable: the watcher describes a safe approach through the crypts. **Edge.** Unfavourable: the company loses precious confidence debating which passages can be trusted. **Doubt.**
- **Selfish — Break the seal and take the burial silver.** Favourable: the untouched offerings fill your packs. **Large cache.** Unfavourable: the opened vault exhales a grave-cold wind that drains the company's strength. **Party strain.**

### U05 · The widow's lantern

A widow searches the crypts with a lantern made from her husband's old watch light. It burns blue whenever a restless spirit approaches.

- **Compassionate — Help her find his resting place.** Favourable: together you quiet the spirit, and her thanks steadies the company. **Resolve.** Unfavourable: the search ends at an empty coffin; the uncertainty weighs on everyone. **Doubt.**
- **Selfish — Take the lantern and leave her to search without it.** Favourable: the blue flame reveals threats before they reach you. **Fervour.** Unfavourable: the lamp goes dark, and her distant calls break your concentration. **Dismay.**

---

## Demonic Invasion — five exclusive encounters

These encounters concern bargains, worship and power purchased at another person's expense. Infernal power is unreliable, but its favourable outcomes are real. No option secretly adds a permanent curse.

### D01 · The chained fiend

A small fiend hangs in a circle of chain. It offers to reveal stolen wealth if you release the captives whose fear has been feeding the circle; a cultist begs you to take the easier bargain instead.

- **Compassionate — Break the captives' bonds and deny the circle its fear.** Favourable: a freed captive points out the cultist's hidden offering purse. **Small cache.** Unfavourable: the collapsing circle lashes the hero breaking its last chain. **Wound.**
- **Selfish — Leave the captives bound and demand the fiend's greater hoard.** Favourable: the fiend honours its narrow promise and reveals a rich cache. **Large cache.** Unfavourable: it feeds on the company's willingness and leaves you hollow with dread. **Dismay.**

### D02 · The ember altar

A dying altar holds heat stolen from the people sheltering nearby. A votive keeper begs you to break its channel before the cold takes them.

- **Compassionate — Return the stolen warmth to the shelter.** Favourable: the released heat reaches your wounded heroes as well. **Shared care.** Unfavourable: a burst of flame catches the hero opening the channel. **Wound.**
- **Selfish — Draw the remaining warmth into your weapons.** Favourable: banked embers burn along every blade and spell. **Ruthless edge.** Unfavourable: the heat turns inward and sears the company. **Party strain.**

### D03 · The false pilgrim

A pilgrim is caught with a cult sigil beneath their sleeve. They insist they joined only to find a missing sibling and offer names in exchange for protection.

- **Compassionate — Hear their account and guide them out.** Favourable: their description of the cult's signals prepares you for the next fight. **Resolve.** Unfavourable: their frightened account contradicts itself, leaving the company uncertain. **Doubt.**
- **Selfish — Take their offering purse and send them back as a decoy.** Favourable: the purse holds several days of collected offerings. **Large cache.** Unfavourable: the cult sees through the deception and the company is hurt getting away. **Party strain.**

### D04 · The living seal

A captive holds both hands against a burning seal. Removing them without care will open the ward; the cult has left their valuables on the far side as bait.

- **Compassionate — Replace the captive's hold with a stone brace.** Favourable: the rescue gives the company renewed purpose. **Resolve.** Unfavourable: the brace slips and the ward burns a hero before settling. **Wound.**
- **Selfish — Leave the captive in place and cross for the valuables.** Favourable: the bait includes an untouched payment chest. **Large cache.** Unfavourable: the captive's strength fails while you cross, and the seal's backlash catches everyone. **Party strain.**

### D05 · The infernal tithe

A cult clerk sorts the possessions of people taken for sacrifice. Some captives are still alive behind a barred arch; the clerk offers you the lists and the keys to the tithe chest.

- **Compassionate — Use the lists and keys to free the captives.** Favourable: a freed broker promises to send a willing recruit your way. **One contract favour.** Unfavourable: the rescue forces a hurried retreat through a narrow, dangerous passage. **Wound.**
- **Selfish — Take the tithe chest and leave the captives listed as paid.** Favourable: the chest contains the valuables of an entire procession. **Large cache.** Unfavourable: the names in the ledger become a bitter argument the company cannot put aside. **Discord.**

---

## Orc Warband — five exclusive encounters

These encounters distinguish civilians, conscripts and deserters from the invading warband. Cruelty comes from the player's action, not the victim's species. No event assumes the Burning Warlord or Elder Shaman has been selected as boss.

### O01 · The white rag

An orc carrying a white rag leads several wounded noncombatants toward a blocked stair. The invaders' insignia have been torn from their clothing.

- **Compassionate — Clear a passage and honour their truce.** Favourable: they warn you of the warband's next patrol. **Edge.** Unfavourable: the rubble shifts as you work and injures a hero. **Wound.**
- **Selfish — Take their supplies and drive them back below.** Favourable: the seized food and dressings restore your company. **Feast.** Unfavourable: a frightened struggle leaves a hero badly hurt. **Deep wound.**

### O02 · The goblin porter

A goblin porter has collapsed beneath a load of the warband's plunder. They offer to show you an unguarded route if you let them leave with a single bundle of their own.

- **Compassionate — Lift the load and let the porter choose their bundle.** Favourable: the promised route gives you the next fight's first advantage. **Resolve.** Unfavourable: the route has changed since the porter last passed, leaving you uncertain and delayed. **Doubt.**
- **Selfish — Take every bundle and force the porter away empty-handed.** Favourable: the plunder includes a substantial coin purse. **Large cache.** Unfavourable: the abandoned porter raises an alarm and you are hurt escaping. **Party strain.**

### O03 · The ancestral drum

An old orc guards a drum used for mourning, not marching. Its metal fittings are valuable; its slow rhythm has gathered scattered civilians into hiding.

- **Compassionate — Help conceal the drum and those following its sound.** Favourable: the elder teaches you a rhythm that helps the company hold together. **Resolve.** Unfavourable: the weight of the mourning makes your own losses harder to bear. **Doubt.**
- **Selfish — Take the drum and turn its rhythm into a battle signal.** Favourable: the stolen cadence drives the company forward with fierce unity. **Fervour.** Unfavourable: the unfamiliar signal tangles your orders and draws the warband's attention. **Discord.**

### O04 · The winter stores

A requisition mark has been painted over a civilian granary. An orc caretaker begs you to leave enough food for those who will remain after either army has gone.

- **Compassionate — Help hide the stores from the warband.** Favourable: the caretaker shares a meal the granary can afford. **Shared care.** Unfavourable: the work leaves you tired and late for the next approach. **Hesitation.**
- **Selfish — Seize the best provisions for your own expedition.** Favourable: good food restores the whole company. **Feast.** Unfavourable: the caretaker's resistance turns the seizure into a scuffle that injures a hero badly. **Deep wound.**

### O05 · The captured scout

A young warband scout lies bound beside an abandoned guard post. They know where the next patrol turns and beg not to be handed back to the officers who sent them here.

- **Compassionate — Cut the bonds and let the scout leave.** Favourable: gratitude buys an accurate account of the patrol route. **Edge.** Unfavourable: the scout's frightened warning sends you watching the wrong passage. **Hesitation.**
- **Selfish — Force the scout ahead to draw the patrol away.** Favourable: the diversion gives your attacks a decisive opening. **Ruthless edge.** Unfavourable: the scout breaks free and warns the patrol; a hero takes the worst of the resulting skirmish. **Deep wound.**

## Review notes before implementation

- The catalogue deliberately uses a limited effect vocabulary. New prose should usually reuse it rather than inventing another lasting stat or inventory system.
- Permanent upgrades and additional heroes are excluded from the initial pool: both can snowball and require balance rules that a small cache does not.
- The general pool currently favours gold and health; the faction pools add identity through intelligence, Command and coercive power. Review whether selfish outcomes produce too much extra gold over a ten-event campaign, particularly if bleak days dominate.
- The odds, gold scaling, 5 general / 3 faction / 2 windfall selection, opening-day outlook and final-day contract conversions are initial tuning values.
- The 40 uncertain situations each have four possible results. The companion modules implement these, the two guaranteed windfalls, the after-battle screen, persistent campaign progress and the downloadable chronicle.


## Guaranteed windfalls — included once each per campaign

### W01 · The forgotten pay chest

A broken pay chest lies behind a fallen banner. There is nobody here to claim it. Your heroes look from the scattered coins to you.

- **Distribute it evenly:** gain 2–4 gold and give every hero +5% damage and healing for the rest of this expedition. Health capacity stays unchanged. The bonus expires when the day ends.
- **Keep the whole cache:** gain 10–14 gold immediately.

### W02 · The apothecary’s satchel

A dust-covered satchel holds two sealed healing potions. The glass is unbroken and the contents still clear. You could use them below, or sell them to fund the town.

- **Keep the healing potions:** add two potions to current expedition supplies, using the current Alchemist’s healing percentage. Extra bottles expire with the expedition; the next day restocks normally.
- **Sell the sealed potions:** gain 6–9 gold immediately.

Both choices in each windfall always succeed, regardless of outlook. Reward amounts use the campaign’s pre-generated roll. No extra failure roll or hidden cost is added.
