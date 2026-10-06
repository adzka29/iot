import { accessProxy } from "@/lib/access-proxy";

const handlers = accessProxy("roles");

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
