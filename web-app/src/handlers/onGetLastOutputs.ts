import { ApiHandlers } from "@/api";
import { useTabs } from "@/hooks/useTabs";
import { TabFile } from "@/types/tabs";

export const onGetLastOutputs = async ({
  addFiles,
}: {
  addFiles: ReturnType<typeof useTabs>["handlers"]["addFiles"];
}) => {
  const res = await new ApiHandlers().getLastOutputs(2);

  const normalizedOutputs: TabFile[] = res.outputs.map((outputRow) => ({
    content: outputRow.output,
    title: outputRow.id.slice(-10),
    //it will be activated on the handler
    active: false,
    id: outputRow.id,
  }));

  addFiles(normalizedOutputs);
};
