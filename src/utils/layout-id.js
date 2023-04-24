class LayoutID {
  static getID() {
    return this.id++;
  }

  static reset() {
    this.id = 0;
  }
}

export default LayoutID;
