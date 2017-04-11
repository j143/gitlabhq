import Vue from 'vue';
import DeployKeysService from '../services/deploy_keys_service';
import DeployKey from './deploy_key';

export default Vue.component('deploy-keys', {
  data() {
    const el = this.$options.el;
    const path = `${el.dataset.namespace}/${el.dataset.name}`;

    return {
      loaded: false,
      path,
      sections: [{
        title: 'Enabled deploy keys for this project',
        keys: [],
        alwaysRender: true,
      }, {
        title: 'Deploy keys from projects you have access to',
        keys: [],
        alwaysRender: true,
      }, {
        title: 'Public deploy keys available to any project',
        keys: [],
        alwaysRender: false,
      }],
    };
  },

  created() {
    this.service = new DeployKeysService('../deploy_keys.json?type=enabled');

    this.service.get().then((response) => {
      const data = response.data;
      this.sections[0].keys = data.enabled_keys;
      this.sections[1].keys = data.available_project_keys;
      this.sections[2].keys = data.public_keys;

      this.loaded = true;
    }).catch((e) => {
      this.loaded = true;
      throw e;
    });
  },
  methods: {
    enableKeyInSectionIndex(index) {
      return index > 0;
    },
    renderSection(section) {
      return section.alwaysRender || !section.alwaysRender && section.keys.length > 0;
    },
  },
  components: {
    'deploy-key': DeployKey,
  },
  template: `
    <div>
      <template
        v-for="(section, index) in sections"
        v-if="renderSection(section)"
      >
        <h5 :class="{'prepend-top-0': index === 0, 'prepend-top-default': index !== 0}">
          {{section.title}}
          <template v-if="loaded">({{section.keys.length}})</template>
        </h5>
        <ul class="well-list" v-if="loaded && section.keys.length > 0">
          <deploy-key
            v-for="key in section.keys"
            :id="key.id"
            :title="key.title"
            :fingerprint="key.fingerprint"
            :projects="key.projects"
            :path="path"
            :canPush="key.can_push"
            :enable="enableKeyInSectionIndex(index)"
            :canRemove="key.destroyed_when_orphaned && key.almost_orphaned"
            :createdAt="key.created_at"
          />
        </ul>
        <div
          v-else-if="loaded && section.keys.length === 0"
          class="settings-message text-center"
        >
          No deploy keys found. Create one with the form above.
        </div>
        <div v-else>
          <i class="fa fa-spin fa-spinner" aria-label="loading" />
        </div>
      </template>
    </div>
  `,
});
