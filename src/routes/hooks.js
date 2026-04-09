import { UnauthorizedError } from "../models/errors.js";

export function validateSession(req, roomManager) {
  const { value, valid } = req.unsignCookie(req.cookies.userId);
  if (!valid) {
    throw new UnauthorizedError("User ID is invalid");
  }
  if (!roomManager.hasRoom(req.params.id)) {
    throw new UnauthorizedError("Room does not exist");
  }
  const room = roomManager.getRoom(req.params.id);
  if (!room.hasUser(value)) {
    throw new UnauthorizedError("User is not part of the room");
  }
  return { userId: value, room };
}
