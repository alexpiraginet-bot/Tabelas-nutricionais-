import React from "react";
import { Composition } from "remotion";
import { BentoStory } from "./BentoStory";

// Stories do Instagram: 1080x1920 (9:16), 30 fps. Duração total da TransitionSeries = 630 frames (21 s).
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="BentoStory"
      component={BentoStory}
      durationInFrames={630}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
