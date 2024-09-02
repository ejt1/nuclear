import Settings from "@/Core/Settings";
import nuclear, { availableBehaviors } from "@/nuclear";

const ProfileSettings = {
  tabName: "Profile Settings",
  options: [
    {
      header: "Profile Selection",
      options: [
        {
          uid: "profileSelector",
          text: "Select Profile",
          type: "combobox",
          default: "None selected"
        }
      ]
    }
  ],
  renderOptions: function(renderOptionsGroup) {
    const specializationId = wow.SpecializationInfo.activeSpecializationId;
    const profileKey = `profile${specializationId}`;

    // Get the current profile for this specialization
    const currentProfile = Settings[profileKey] ? Settings[profileKey] : "None selected";

    // Find all behaviors that match the current specialization
    const availableProfiles = this.findAvailableProfilesForSpecialization(specializationId);

    // Update the combobox options
    this.options[0].options[0].options = availableProfiles;
    this.options[0].options[0].default = currentProfile;

    renderOptionsGroup(this.options);
  },
  findAvailableProfilesForSpecialization: function(specializationId) {
    const matchingBehaviors = availableBehaviors.filter(behavior => behavior.specialization === specializationId);
    return matchingBehaviors.map(behavior => behavior.name || behavior.constructor.name);
  }
};

export default ProfileSettings;
