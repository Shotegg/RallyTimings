# Rally Timings

Static GitHub Pages calculator for synchronized Kingshot marches.

The calculator uses:

```text
time = ceil(5 + distance × 1300 / (1300 + distance) × 60 / (11 × speedBuff))
speedBuff = 1 + speed% / 100
```

Player coordinates describe a 2×2 object; target coordinates are the lower-left coordinates. The calculator uses the centres of the objects: `+1` for 2×2 targets and players, and `+3` for the 6×6 castle.

## Publish with GitHub Pages

In the repository's **Settings → Pages**, choose **Deploy from a branch**, then select `main` and the `/ (root)` folder. GitHub will publish the site at `https://shotegg.github.io/RallyTimings/`.
