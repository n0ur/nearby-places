export class Location {
  constructor(locationId, userId, position, formattedAddress) {
    this.id = locationId;
    this.userId = userId;
    this.position = position;
    this.formattedAddress = formattedAddress;
  }

  serialize() {
    return {
      id: this.id,
      position: this.position,
      formatted_address: this.formattedAddress,
      userId: this.userId,
    };
  }
}
