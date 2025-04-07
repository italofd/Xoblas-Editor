import { DialogRef, SetShouldShowDialog } from "@/types/components";

export const Notification = ({
  dialogRef: notificationRef,
  message,
  setShouldShowDialog,
}: {
  dialogRef: DialogRef;
  message: string;
  setShouldShowDialog: SetShouldShowDialog;
}) => (
  <dialog
    ref={notificationRef}
    className={`absolute top-8 left-auto right-8 w-64 p-4 rounded shadow-lg border-l-4 bg-green-100 border-green-500 text-green-700`}
  >
    <div className="top-0 flex justify-between items-start">
      <p className="font-medium">{message}</p>
      <button
        onClick={() => notificationRef.current && setShouldShowDialog(false)}
        className="text-gray-500 hover:text-gray-700 ml-2"
      >
        ×
      </button>
    </div>
  </dialog>
);
