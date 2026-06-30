import React from "react";
import { Composition } from "remotion";
import { BentoStory } from "./BentoStory";
import { EventosStory } from "./EventosStory";
import { DeliveryStory } from "./DeliveryStory";
import { SemCulpaStory } from "./SemCulpaStory";
import { FranquiasStory } from "./FranquiasStory";

// Todas em 1080x1920 (9:16), 30 fps — formato Instagram Stories.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="BentoStory" component={BentoStory} durationInFrames={630} fps={30} width={1080} height={1920} />
      <Composition id="EventosStory" component={EventosStory} durationInFrames={645} fps={30} width={1080} height={1920} />
      <Composition id="DeliveryStory" component={DeliveryStory} durationInFrames={395} fps={30} width={1080} height={1920} />
      <Composition id="SemCulpaStory" component={SemCulpaStory} durationInFrames={520} fps={30} width={1080} height={1920} />
      <Composition id="FranquiasStory" component={FranquiasStory} durationInFrames={690} fps={30} width={1080} height={1920} />
    </>
  );
};
