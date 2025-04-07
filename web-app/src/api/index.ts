import { apiClient } from "@/api/client";
import { executePythonCode } from "./functions/execute";
import { ping } from "./functions/ping";
import { getServerURL } from "@/utils/getServerURL";
import { ApiClient } from "@/types/api";
import { getLastOutputs } from "./functions/getLastOutputs";

//Classes because the client will need to reuse own functionality
//Doing that in factory or other design pattern its considerable worse
export class ApiHandlers {
  private client: ApiClient;

  constructor(API_BASE_URL = getServerURL()) {
    this.client = apiClient(API_BASE_URL);
  }

  private async ping() {
    await ping({ apiClient: this.client });
  }

  private async serverHealthCheck() {
    //More things could be added here instead of overflowing ping
    //As we are on server free tier, it goes off if its not being used and takes somewhere about 40s to get up.
    await this.ping();
  }

  public async execute(code: string, should_save: boolean) {
    //Wait for ping to be successful to proceed, that could be just on cold starts
    await this.serverHealthCheck();

    return await executePythonCode(
      { apiClient: this.client },
      { code, should_save },
    );
  }

  public async getLastOutputs(quantity: number) {
    await this.serverHealthCheck();

    return getLastOutputs({ apiClient: this.client }, { quantity });
  }
}
