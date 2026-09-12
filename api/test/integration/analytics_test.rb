# frozen_string_literal: true

require "test_helper"

class AnalyticsTest < ActionDispatch::IntegrationTest
  # Ahoy drops requests with no User-Agent as bots (`Ahoy.track_bots` is off),
  # which is right in production and means tests have to look like a browser.
  BROWSER = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " \
            "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

  setup { @kid = create_user }

  test "a visit is recorded from the tracking endpoint" do
    assert_difference -> { Ahoy::Visit.count }, 1 do
      track_visit
    end

    visit = Ahoy::Visit.last
    assert_equal "https://make.hackclub.com/", visit.landing_page
    assert_equal "utm-source", visit.utm_source
  end

  test "a visit made while signed in is attributed to the user" do
    sign_in_as @kid

    track_visit

    assert_equal @kid, Ahoy::Visit.last.user
  end

  test "an anonymous visit records no user rather than failing" do
    track_visit

    assert_nil Ahoy::Visit.last.user
  end

  test "events attach to their visit" do
    track_visit

    assert_difference -> { Ahoy::Event.count }, 1 do
      post "/ahoy/events", params: {
        visit_token: visit_params[:visit_token],
        visitor_token: visit_params[:visitor_token],
        events: [ { name: "project_shipped", properties: { project_id: "prj_abc" }, time: Time.current.to_f } ]
      }, as: :json, headers: { "User-Agent" => BROWSER }
    end

    event = Ahoy::Event.last
    assert_equal "project_shipped", event.name
    assert_equal "prj_abc", event.properties["project_id"]
    assert_equal Ahoy::Visit.last, event.visit
  end

  test "tracking does not require signing in" do
    track_visit

    assert_response :success
    assert_equal 1, Ahoy::Visit.count
  end

  test "a crawler is not counted as a visit" do
    assert_no_difference -> { Ahoy::Visit.count } do
      post "/ahoy/visits", params: visit_params, as: :json,
           headers: { "User-Agent" => "Googlebot/2.1 (+http://www.google.com/bot.html)" }
    end
  end

  # `mask_ips` keeps the network but drops the host, so a visit cannot be tied
  # back to one machine.
  test "the ip comes from the proxy header and is masked before storage" do
    track_visit(headers: { "X-Forwarded-Client-Ip" => "203.0.113.45" })

    assert_equal "203.0.113.0", Ahoy::Visit.last.ip
  end

  private

  def track_visit(headers: {})
    post "/ahoy/visits", params: visit_params, as: :json,
         headers: { "User-Agent" => BROWSER }.merge(headers)
  end

  def visit_params
    @visit_params ||= {
      visit_token: SecureRandom.uuid,
      visitor_token: SecureRandom.uuid,
      landing_page: "https://make.hackclub.com/",
      screen_width: 1440,
      screen_height: 900,
      js: true,
      utm_source: "utm-source"
    }
  end
end
