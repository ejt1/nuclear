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
  renderOptions: function (renderOptionsGroup) {
    const specializationId = wow.SpecializationInfo.activeSpecializationId;
    const profileKey = `profile${specializationId}`;

    const currentProfile = Settings[profileKey] ? Settings[profileKey] : "None selected";

    const availableProfiles = this.findAvailableProfilesForSpecialization(specializationId);

    this.options[0].options[0].options = availableProfiles;
    this.options[0].options[0].default = currentProfile;

    const behaviorSettings = nuclear.behaviorSettings || [];

    const allOptions = [
      ...this.options,
      {
        header: "Behavior-specific Settings",
        options: behaviorSettings
      }
    ];

    renderOptionsGroup(allOptions);
  },
  findAvailableProfilesForSpecialization: function (specializationId) {
    const matchingBehaviors = availableBehaviors.filter(behavior => behavior.specialization === specializationId);
    return matchingBehaviors.map(behavior => behavior.name || behavior.constructor.name);
  }
};

export default ProfileSettings;
