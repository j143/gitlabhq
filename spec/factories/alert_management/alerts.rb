# frozen_string_literal: true
require 'ffaker'

FactoryBot.define do
  factory :alert_management_alert, class: 'AlertManagement::Alert' do
    triggered
    project
    title { FFaker::Lorem.sentence }
    started_at { Time.current }

    trait :with_issue do
      issue
    end

    trait :with_fingerprint do
      fingerprint { SecureRandom.hex }
    end

    trait :with_service do
      service { FFaker::Product.product_name }
    end

    trait :with_monitoring_tool do
      monitoring_tool { FFaker::AWS.product_description }
    end

    trait :with_description do
      description { FFaker::Lorem.sentence }
    end

    trait :with_host do
      hosts { [FFaker::Internet.ip_v4_address] }
    end

    trait :with_ended_at do
      ended_at { Time.current }
    end

    trait :without_ended_at do
      ended_at { nil }
    end

    trait :triggered do
      status { AlertManagement::Alert::STATUSES[:triggered] }
      without_ended_at
    end

    trait :acknowledged do
      status { AlertManagement::Alert::STATUSES[:acknowledged] }
      without_ended_at
    end

    trait :resolved do
      status { AlertManagement::Alert::STATUSES[:resolved] }
      with_ended_at
    end

    trait :ignored do
      status { AlertManagement::Alert::STATUSES[:ignored] }
      without_ended_at
    end

    trait :low_severity do
      severity { 'low' }
    end

    trait :prometheus do
      monitoring_tool { Gitlab::AlertManagement::AlertParams::MONITORING_TOOLS[:prometheus] }
    end

    trait :all_fields do
      with_issue
      with_fingerprint
      with_service
      with_monitoring_tool
      with_host
      with_description
      low_severity
    end
  end
end
