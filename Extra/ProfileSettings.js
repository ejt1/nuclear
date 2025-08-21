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
          default: "Nuclear Default"
        }
      ]
    }
  ],
  renderOptions: function (renderOptionsGroup) {
    const specializationId = wow.SpecializationInfo.activeSpecializationId;
    const profileKey = `profile${specializationId}`;

    const currentProfile = Settings[profileKey] ? Settings[profileKey] : "Nuclear Default";

    this.options[0].options[0].options = this.findAvailableProfilesForSpecialization(specializationId);
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
    const matchingBehaviors = availableBehaviors.filter(behavior =>
      behavior.specialization === specializationId || behavior.specialization === 9999 // Specialization.All
    );
    return matchingBehaviors.map(behavior => behavior.name || behavior.constructor.name);
  }
};

export default ProfileSettings;
