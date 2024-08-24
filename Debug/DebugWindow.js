import objMgr from '../Core/ObjectManager';

class DebugWindow {
  constructor() {
    this.show = new imgui.MutableVariable(false);
    this.selected = null;
    this.selectedSpell = null;
  }

  tick() {
    if (imgui.isKeyPressed(imgui.Key.F12, false)) {
      this.show.value = !this.show.value;
    }

    if (this.show.value) {
      this.render(this.show);
    }
  }

  render(open) {
    const mainViewport = imgui.getMainViewport();
    const workPos = mainViewport.workPos;
    imgui.setNextWindowPos({ x: workPos.x + 20, y: workPos.y + 20 }, imgui.Cond.FirstUseEver);
    imgui.setNextWindowSize({ x: 550, y: 480 }, imgui.Cond.FirstUseEver);

    if (!imgui.begin("Debug", open)) {
      imgui.end();
      return;
    }

    if (imgui.beginTabBar("debugTabs")) {
      if (imgui.beginTabItem("ObjectManager")) {
        this.renderObjectManager();
        imgui.endTabItem();
      }

      if (imgui.beginTabItem("GameUI")) {
        this.renderGameUI();
        imgui.endTabItem();
      }

      if (imgui.beginTabItem("SpellBook")) {
        this.renderSpellBook();
        imgui.endTabItem();
      }

      if (imgui.beginTabItem("Specialization Info")) {
        this.renderSpecializationInfo();
        imgui.endTabItem();
      }

      if (imgui.beginTabItem("Party Info")) {
        this.renderPartyInfo();
        imgui.endTabItem();
      }
    }

    imgui.end();
  }

  renderObjectManager() {
    imgui.beginChild("object list", { x: 150, y: 0 });
    /** @type {Map<wow.ObjectTypeID, Array<wow.CGObject>>} */
    let sortedObjects = new Map();
    for (const typename in wow.ObjectTypeID) {
      const id = wow.ObjectTypeID[typename];
      sortedObjects.set(id, new Array());
    }
    objMgr.objects.forEach(obj => sortedObjects.get(obj.type).push(obj));
    for (const typename in wow.ObjectTypeID) {
      const id = wow.ObjectTypeID[typename];
      const objects = sortedObjects.get(id);
      if (objects.length === 0) {
        continue;
      }
      objects.sort((a, b) => a.unsafeName < b.unsafeName);
      if (imgui.treeNode(`${typename}`)) {
        objects.forEach(obj => {
          const guid = obj.guid;
          if (imgui.selectable(`${obj.unsafeName}##${guid.hash}`, this.selected && this.selected == guid.hash)) {
            this.selected = guid.hash;
          }
        });

        imgui.treePop();
      }
    }

    const object = this.selected ? objMgr.objects.get(this.selected) : undefined;
    if (object === undefined) {
      this.selected = null;
    }
    imgui.endChild();
    imgui.sameLine();

    imgui.beginGroup();
    imgui.beginChild("object info", { x: 0, y: -imgui.getFrameHeightWithSpacing() });
    if (object) {
      imgui.text(`${object.constructor.name}: ${object.unsafeName} 0x${object.baseAddress.toString(16)}`);
      imgui.sameLine();
      if (imgui.button("Copy base")) {
        imgui.setClipboardText(`0x${object.baseAddress.toString(16)}`);
      }
      if (imgui.button("Target")) {
        wow.GameUI.setTarget(object);
      }
      const screenCoordinates = wow.WorldFrame.getScreenCoordinates(object.position);
      if (screenCoordinates) {
        const x = parseInt(screenCoordinates.x.toString());
        imgui.text(`screen coordinates: <${x}, ${screenCoordinates.y}, ${screenCoordinates.z}>`);
      }
      imgui.separator();
      if (imgui.beginTable("data", 2)) {
        imgui.tableSetupColumn('key', imgui.TableColumnFlags.WidthFixed);
        imgui.tableSetupColumn('value', imgui.TableColumnFlags.WidthStretch);
        imgui.tableHeadersRow();
        Object.getOwnPropertyNames(Object.getPrototypeOf(object)).forEach(prop => {
          try {
            if (prop === 'constructor') {
              return;
            }
            imgui.tableNextRow();
            imgui.tableNextColumn();
            imgui.text(prop);
            imgui.tableNextColumn();

            const val = object[prop];
            if (typeof val === 'object') {
              imgui.text(JSON.stringify(val, (k, v) => {
                if (typeof v === 'bigint') {
                  return '0x' + v.toString(16);
                }
                return v;
              }, 2));
            } else {
              imgui.text(`${val}`);
            }
          } catch (e) {
            imgui.text(e.message);
          }
        });
        imgui.endTable();
      }
    }
    imgui.endChild();
    imgui.endGroup();
  }

  renderGameUI() {
    if (imgui.beginTable("CGGameUI##data", 2)) {
      imgui.tableSetupColumn('key', imgui.TableColumnFlags.WidthFixed);
      imgui.tableSetupColumn('value', imgui.TableColumnFlags.WidthStretch);
      imgui.tableHeadersRow();
      Object.keys(wow.GameUI).forEach(prop => {
        try {
          if (prop === 'constructor') {
            return;
          }
          imgui.tableNextRow();
          imgui.tableNextColumn();
          imgui.text(prop);
          imgui.tableNextColumn();

          const val = wow.GameUI[prop];
          if (typeof val === 'object') {
            imgui.text(JSON.stringify(val, (k, v) => {
              if (typeof v === 'bigint') {
                return '0x' + v.toString(16);
              }
              return v;
            }, 2));
          } else {
            imgui.text(`${val}`);
          }
        } catch (e) {
          imgui.text(e.message);
        }
      });
      imgui.endTable();
    }
  }

  renderSpellBook() {
    const playerSpells = wow.SpellBook.playerSpells;
    const petSpells = wow.SpellBook.petSpells;
    imgui.beginChild("spell list", { x: 200, y: 0 });
    if (playerSpells.length > 0) {
      if (imgui.treeNode("Player spells")) {
        playerSpells.forEach(spell => {
          if (imgui.selectable(`${spell.name}##${spell.id}`)) {
            this.selectedSpell = spell;
          }
        });
        imgui.treePop();
      }
    }
    if (petSpells.length > 0) {
      if (imgui.treeNode("Pet spells")) {
        petSpells.forEach(spell => {
          if (imgui.selectable(`${spell.name} (${spell.id})##${spell.id}`)) {
            this.selectedSpell = spell;
          }
        });
        imgui.treePop();
      }
    }
    imgui.endChild();
    imgui.sameLine();

    imgui.beginGroup();
    imgui.beginChild("spell info", { x: 0, y: -imgui.getFrameHeightWithSpacing() });
    const spell = this.selectedSpell;
    if (spell) {
      imgui.text(`${spell.constructor.name}: ${spell.name}`);
      imgui.separator();
      if (imgui.beginTable("data", 2)) {
        imgui.tableSetupColumn('key', imgui.TableColumnFlags.WidthFixed);
        imgui.tableSetupColumn('value', imgui.TableColumnFlags.WidthStretch);
        imgui.tableHeadersRow();
        Object.getOwnPropertyNames(Object.getPrototypeOf(spell)).forEach(prop => {
          try {
            if (prop === 'constructor') {
              return;
            }
            imgui.tableNextRow();
            imgui.tableNextColumn();
            imgui.text(prop);
            imgui.tableNextColumn();

            const val = spell[prop];
            if (typeof val === 'object') {
              imgui.text(JSON.stringify(val, (k, v) => {
                if (typeof v === 'bigint') {
                  return '0x' + v.toString(16);
                }
                return v;
              }, 2));
            } else {
              imgui.text(`${val}`);
            }
          } catch (e) {
            imgui.text(e.message);
          }
        });
        imgui.endTable();
      }
    }
    imgui.endChild();
    imgui.endGroup();
  }

  renderSpecializationInfo() {
    const specInfo = new wow.SpecializationInfo;
    if (imgui.beginTable("SpecializationInfo##data", 2)) {
      imgui.tableSetupColumn('key', imgui.TableColumnFlags.WidthFixed);
      imgui.tableSetupColumn('value', imgui.TableColumnFlags.WidthStretch);
      imgui.tableHeadersRow();

      Object.keys(wow.SpecializationInfo).forEach(prop => {
        try {
          if (prop === 'constructor') {
            return;
          }
          imgui.tableNextRow();
          imgui.tableNextColumn();
          imgui.text(prop);
          imgui.tableNextColumn();

          const val = wow.SpecializationInfo[prop];
          if (typeof val === 'object') {
            imgui.text(JSON.stringify(val, (k, v) => {
              if (typeof v === 'bigint') {
                return '0x' + v.toString(16);
              }
              return v;
            }, 2));
          } else {
            imgui.text(`${val}`);
          }
        } catch (e) {
          imgui.text(e.message);
        }
      });
      imgui.endTable();
    }
  }

  renderPartyInfo() {
    const party = wow.Party.currentParty;
    if (!party){
      imgui.text("No party");
      return;
    }
    if (imgui.beginTable("Party##data", 2)) {
      imgui.tableSetupColumn('key', imgui.TableColumnFlags.WidthFixed);
      imgui.tableSetupColumn('value', imgui.TableColumnFlags.WidthStretch);
      imgui.tableHeadersRow();

      Object.getOwnPropertyNames(Object.getPrototypeOf(party)).forEach(prop => {
        try {
          if (prop === 'constructor') {
            return;
          }
          imgui.tableNextRow();
          imgui.tableNextColumn();
          imgui.text(prop);
          imgui.tableNextColumn();

          const val = party[prop];
          if (typeof val === 'object') {
            imgui.text(JSON.stringify(val, (k, v) => {
              if (typeof v === 'bigint') {
                return '0x' + v.toString(16);
              }
              return v;
            }, 2));
          } else {
            imgui.text(`${val}`);
          }
        } catch (e) {
          imgui.text(e.message);
        }
      });
      imgui.endTable();
    }
  }
}

export default new DebugWindow;
