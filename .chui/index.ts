import * as serverless from "./serverless";
import {
    ENDPOINT
} from "./constants";

serverless.install();

export const endpoint = ENDPOINT;