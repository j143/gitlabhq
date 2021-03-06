import $ from 'jquery';
import MockAdaptor from 'axios-mock-adapter';
import axios from '~/lib/utils/axios_utils';
import IntegrationSettingsForm from '~/integrations/integration_settings_form';

describe('IntegrationSettingsForm', () => {
  const FIXTURE = 'services/edit_service.html';
  preloadFixtures(FIXTURE);

  beforeEach(() => {
    loadFixtures(FIXTURE);
  });

  describe('contructor', () => {
    let integrationSettingsForm;

    beforeEach(() => {
      integrationSettingsForm = new IntegrationSettingsForm('.js-integration-settings-form');
      jest.spyOn(integrationSettingsForm, 'init').mockImplementation(() => {});
    });

    it('should initialize form element refs on class object', () => {
      // Form Reference
      expect(integrationSettingsForm.$form).toBeDefined();
      expect(integrationSettingsForm.$form.prop('nodeName')).toEqual('FORM');
      expect(integrationSettingsForm.formActive).toBeDefined();

      // Form Child Elements
      expect(integrationSettingsForm.$submitBtn).toBeDefined();
      expect(integrationSettingsForm.$submitBtnLoader).toBeDefined();
      expect(integrationSettingsForm.$submitBtnLabel).toBeDefined();
    });

    it('should initialize form metadata on class object', () => {
      expect(integrationSettingsForm.testEndPoint).toBeDefined();
      expect(integrationSettingsForm.canTestService).toBeDefined();
    });
  });

  describe('toggleServiceState', () => {
    let integrationSettingsForm;

    beforeEach(() => {
      integrationSettingsForm = new IntegrationSettingsForm('.js-integration-settings-form');
    });

    it('should remove `novalidate` attribute to form when called with `true`', () => {
      integrationSettingsForm.formActive = true;
      integrationSettingsForm.toggleServiceState();

      expect(integrationSettingsForm.$form.attr('novalidate')).not.toBeDefined();
    });

    it('should set `novalidate` attribute to form when called with `false`', () => {
      integrationSettingsForm.formActive = false;
      integrationSettingsForm.toggleServiceState();

      expect(integrationSettingsForm.$form.attr('novalidate')).toBeDefined();
    });
  });

  describe('toggleSubmitBtnLabel', () => {
    let integrationSettingsForm;

    beforeEach(() => {
      integrationSettingsForm = new IntegrationSettingsForm('.js-integration-settings-form');
    });

    it('should set Save button label to "Test settings and save changes" when serviceActive & canTestService are `true`', () => {
      integrationSettingsForm.canTestService = true;
      integrationSettingsForm.formActive = true;

      integrationSettingsForm.toggleSubmitBtnLabel();

      expect(integrationSettingsForm.$submitBtnLabel.text()).toEqual(
        'Test settings and save changes',
      );
    });

    it('should set Save button label to "Save changes" when either serviceActive or canTestService (or both) is `false`', () => {
      integrationSettingsForm.canTestService = false;
      integrationSettingsForm.formActive = false;

      integrationSettingsForm.toggleSubmitBtnLabel();

      expect(integrationSettingsForm.$submitBtnLabel.text()).toEqual('Save changes');

      integrationSettingsForm.formActive = true;

      integrationSettingsForm.toggleSubmitBtnLabel();

      expect(integrationSettingsForm.$submitBtnLabel.text()).toEqual('Save changes');

      integrationSettingsForm.canTestService = true;
      integrationSettingsForm.formActive = false;

      integrationSettingsForm.toggleSubmitBtnLabel();

      expect(integrationSettingsForm.$submitBtnLabel.text()).toEqual('Save changes');
    });
  });

  describe('toggleSubmitBtnState', () => {
    let integrationSettingsForm;

    beforeEach(() => {
      integrationSettingsForm = new IntegrationSettingsForm('.js-integration-settings-form');
    });

    it('should disable Save button and show loader animation when called with `true`', () => {
      integrationSettingsForm.toggleSubmitBtnState(true);

      expect(integrationSettingsForm.$submitBtn.is(':disabled')).toBeTruthy();
      expect(integrationSettingsForm.$submitBtnLoader.hasClass('hidden')).toBeFalsy();
    });

    it('should enable Save button and hide loader animation when called with `false`', () => {
      integrationSettingsForm.toggleSubmitBtnState(false);

      expect(integrationSettingsForm.$submitBtn.is(':disabled')).toBeFalsy();
      expect(integrationSettingsForm.$submitBtnLoader.hasClass('hidden')).toBeTruthy();
    });
  });

  describe('testSettings', () => {
    let integrationSettingsForm;
    let formData;
    let mock;

    beforeEach(() => {
      mock = new MockAdaptor(axios);

      jest.spyOn(axios, 'put');

      integrationSettingsForm = new IntegrationSettingsForm('.js-integration-settings-form');
      // eslint-disable-next-line no-jquery/no-serialize
      formData = integrationSettingsForm.$form.serialize();
    });

    afterEach(() => {
      mock.restore();
    });

    it('should make an ajax request with provided `formData`', () => {
      return integrationSettingsForm.testSettings(formData).then(() => {
        expect(axios.put).toHaveBeenCalledWith(integrationSettingsForm.testEndPoint, formData);
      });
    });

    it('should show error Flash with `Save anyway` action if ajax request responds with error in test', () => {
      const errorMessage = 'Test failed.';
      mock.onPut(integrationSettingsForm.testEndPoint).reply(200, {
        error: true,
        message: errorMessage,
        service_response: 'some error',
        test_failed: true,
      });

      return integrationSettingsForm.testSettings(formData).then(() => {
        const $flashContainer = $('.flash-container');

        expect(
          $flashContainer
            .find('.flash-text')
            .text()
            .trim(),
        ).toEqual('Test failed. some error');

        expect($flashContainer.find('.flash-action')).toBeDefined();
        expect(
          $flashContainer
            .find('.flash-action')
            .text()
            .trim(),
        ).toEqual('Save anyway');
      });
    });

    it('should not show error Flash with `Save anyway` action if ajax request responds with error in validation', () => {
      const errorMessage = 'Validations failed.';
      mock.onPut(integrationSettingsForm.testEndPoint).reply(200, {
        error: true,
        message: errorMessage,
        service_response: 'some error',
        test_failed: false,
      });

      return integrationSettingsForm.testSettings(formData).then(() => {
        const $flashContainer = $('.flash-container');

        expect(
          $flashContainer
            .find('.flash-text')
            .text()
            .trim(),
        ).toEqual('Validations failed. some error');

        expect($flashContainer.find('.flash-action')).toBeDefined();
        expect(
          $flashContainer
            .find('.flash-action')
            .text()
            .trim(),
        ).toEqual('');
      });
    });

    it('should submit form if ajax request responds without any error in test', () => {
      jest.spyOn(integrationSettingsForm.$form, 'submit').mockImplementation(() => {});

      mock.onPut(integrationSettingsForm.testEndPoint).reply(200, {
        error: false,
      });

      return integrationSettingsForm.testSettings(formData).then(() => {
        expect(integrationSettingsForm.$form.submit).toHaveBeenCalled();
      });
    });

    it('should submit form when clicked on `Save anyway` action of error Flash', () => {
      jest.spyOn(integrationSettingsForm.$form, 'submit').mockImplementation(() => {});

      const errorMessage = 'Test failed.';
      mock.onPut(integrationSettingsForm.testEndPoint).reply(200, {
        error: true,
        message: errorMessage,
        test_failed: true,
      });

      return integrationSettingsForm
        .testSettings(formData)
        .then(() => {
          const $flashAction = $('.flash-container .flash-action');

          expect($flashAction).toBeDefined();

          $flashAction.get(0).click();
        })
        .then(() => {
          expect(integrationSettingsForm.$form.submit).toHaveBeenCalled();
        });
    });

    it('should show error Flash if ajax request failed', () => {
      const errorMessage = 'Something went wrong on our end.';

      mock.onPut(integrationSettingsForm.testEndPoint).networkError();

      return integrationSettingsForm.testSettings(formData).then(() => {
        expect(
          $('.flash-container .flash-text')
            .text()
            .trim(),
        ).toEqual(errorMessage);
      });
    });

    it('should always call `toggleSubmitBtnState` with `false` once request is completed', () => {
      mock.onPut(integrationSettingsForm.testEndPoint).networkError();

      jest.spyOn(integrationSettingsForm, 'toggleSubmitBtnState').mockImplementation(() => {});

      return integrationSettingsForm.testSettings(formData).then(() => {
        expect(integrationSettingsForm.toggleSubmitBtnState).toHaveBeenCalledWith(false);
      });
    });
  });
});
