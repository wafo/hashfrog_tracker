# HashFrog Tracker

A tracker for Ocarina of Time Randomizer seeds: it shows which items a player has found and which checks are reachable under the seed's settings.

## Language

**Generator**:
The Ocarina of Time Randomizer itself, run by ootrandomizer.com, which produces seeds and is the authority on what a settings string means.
_Avoid_: Randomizer site, OOTR API

**Generator version**:
The identifier of the generator build a seed was made with, either a release ("9.1.0") or a dev build named by its dev branch prefix ("dev_9.1.28").
_Avoid_: Version (alone), randomizer version

**Dev branch**:
A non-release line of the generator (upstream Dev or a fork such as Dev-Rob), identified by the prefix it reports in its generator versions.
_Avoid_: Fork (when meaning the prefix)

**Settings string**:
The compact code that encodes every setting of a seed for a given generator version; meaningless without that version.
_Avoid_: Seed string, settings code

**Decoded settings**:
The full set of named settings that a settings string stands for, as the generator reports them.
_Avoid_: Parsed settings, settings JSON

**Preset**:
A named, curated pairing of a generator version and a settings string (e.g. "Mentor 2026") offered on the launcher.
_Avoid_: Template, profile

**Logic**:
The generator's rules for which locations are reachable with which items, loaded for a specific generator version.
_Avoid_: Rules, logic files (when meaning the concept)

**Check**:
A location in the game that holds an item and that the player can mark as collected.
_Avoid_: Location (in UI copy), spot

**Check tracking**:
The tracker mode that combines logic and decoded settings to show which checks are reachable.
_Avoid_: Logic mode, auto-tracking
