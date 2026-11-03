// The generator's dev branches, keyed by the version prefix each one reports.
// Kept free of imports so the Worker can share it with the frontend.

export const DEFAULT_OWNER = "OoTRandomizer";

// Maps dev-branch version prefixes to the repository branch that hosts the matching logic files.
// `buildTag` turns a reported build into the tag that repository publishes it under.
// Each project names its tags differently, and a fork with no usable scheme simply has none.
export const DEV_FORK_BRANCHES = {
  // Upstream publishes each dev build as a bare version tag ("9.1.28"), but prunes older ones
  dev_: { owner: DEFAULT_OWNER, tag: "Dev", buildTag: (base, build) => (build ? null : base) },

  // Reports "9.0.2-17", publishes "9.0.2.Rob-17"
  devrreal_: { owner: "rrealmuto", tag: "Dev-Rob", buildTag: (base, build) => (build ? `${base}.Rob-${build}` : null) },

  // Reports "9.1.10-6", publishes "9.1.10-fenhl.6"
  devFenhl_: { owner: "fenhl", tag: "dev-fenhl", buildTag: (base, build) => (build ? `${base}-fenhl.${build}` : null) },

  // Dev-R publishes no tags for the builds it currently reports
  devR_: { owner: "Roman971", tag: "Dev-R" },

  // Shares Dev-Rob's repository; its tags carry an E for the enemy-shuffle line
  devEnemyShuffle_: {
    owner: "rrealmuto",
    tag: "enemy_shuffle",
    buildTag: (base, build) => (build ? `${base}.Rob-E${build}` : null),
  },

  // This fork also calls its branch "Dev", and its tag names do not follow from the build it reports
  devTFBlitz_: { owner: "Elagatua", tag: "Dev", displayName: "Dev-TFBlitz" },
};
