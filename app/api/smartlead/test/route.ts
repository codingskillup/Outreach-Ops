import { NextResponse } from "next/server";

type SmartleadCampaign = {
  id?: number;
  name?: string;
  status?: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const apiKey =
      typeof body.apiKey === "string"
        ? body.apiKey.trim()
        : "";

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Smartlead API key is required.",
        },
        {
          status: 400,
        }
      );
    }

    const accountsUrl =
      "https://server.smartlead.ai/api/v1/email-accounts/" +
      `?api_key=${encodeURIComponent(apiKey)}` +
      "&offset=0&limit=1";

    const accountsResponse = await fetch(accountsUrl, {
      method: "GET",
      cache: "no-store",
    });

    if (!accountsResponse.ok) {
      if (
        accountsResponse.status === 401 ||
        accountsResponse.status === 403
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid Smartlead API key.",
          },
          {
            status: 401,
          }
        );
      }

      if (accountsResponse.status === 429) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Smartlead rate limit reached. Try again shortly.",
          },
          {
            status: 429,
          }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message:
            "Smartlead connection could not be verified.",
        },
        {
          status: accountsResponse.status,
        }
      );
    }

    const campaignsUrl =
      "https://server.smartlead.ai/api/v1/campaigns/" +
      `?api_key=${encodeURIComponent(apiKey)}`;

    const campaignsResponse = await fetch(campaignsUrl, {
      method: "GET",
      cache: "no-store",
    });

    if (!campaignsResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Smartlead connected, but campaigns could not be loaded.",
        },
        {
          status: campaignsResponse.status,
        }
      );
    }

    const campaignsData =
      await campaignsResponse.json();

    const campaigns: SmartleadCampaign[] =
      Array.isArray(campaignsData)
        ? campaignsData
        : Array.isArray(campaignsData?.data)
          ? campaignsData.data
          : [];

    const activeCampaigns =
      campaigns.filter(
        (campaign) =>
          campaign.status?.toUpperCase() === "ACTIVE"
      ).length;

    return NextResponse.json({
      success: true,
      message: "Smartlead connection successful.",
      campaignCount: campaigns.length,
      activeCampaignCount: activeCampaigns,
    });
  } catch (error) {
    console.error("Smartlead test error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while testing Smartlead.",
      },
      {
        status: 500,
      }
    );
  }
}