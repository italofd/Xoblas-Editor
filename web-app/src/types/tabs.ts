import { useTabs } from "@/hooks/useTabs";

export type TabFile = {
  id: string;
  title: string;
  content: string;
  active: boolean;
};

export type SetIsLoadingOutputs = ReturnType<
  typeof useTabs
>["handlers"]["setIsLoadingOutputs"];

export type AddOutputFiles = ReturnType<typeof useTabs>["handlers"]["addFiles"];
