export type OutputCodeDBSchema = {
  //UUID
  id: string;
  //UUID from the executable that have generated this output (stored on another table)
  executable_id: string;
  //The actual python output =)
  output: string;
  timestamp: number;
};
