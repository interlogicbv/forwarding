export const query1 = `
  SELECT
    S.GUID AS id,
    CA.Bool8 AS protal,
    S.SalesOrder AS salesOrder,
    S.Reference AS reference,
    CA.LoadingMeter AS loadingMeter,
    CA.Weight AS [weight],
    S.distance,
    S.TotalAmount AS price,

    LA.[Date] AS loadingDate,
    LA.Time AS loadingTime,
    LA.TimeTill AS loadingTimeTill,
    LA.Address_Name AS loadingName,
    LA.Address_Cityname AS loadingCity,
    LA.Address_ZIPcode AS loadingZip,
    LA.Address_CountryCode AS loadingCountry,

    UA.[Date] AS unloadingDate,
    UA.Time AS unloadingTime,
    UA.TimeTill AS unloadingTimeTill,
    UA.Address_Name AS unloadingName,
    UA.Address_Cityname AS unloadingCity,
    UA.Address_ZIPcode AS unloadingZip,
    UA.Address_CountryCode AS unloadingCountry

  FROM SO_Leg S

  LEFT JOIN SO_Activity LA
    ON S.BeginActivity = LA.Activitynr

  LEFT JOIN SO_Activity UA
    ON S.EndActivity = UA.Activitynr

  LEFT JOIN SO_Cargo CA
    ON S.Legnr = CA.Leg

  WHERE
    S.Planned IS NULL
    AND S.Invoiced IS NULL
    AND LA.[Date] > DATEADD(
      DD, -1, CAST(GETDATE() AS DATE)
    )
    AND S.PlanGroup = 8

  ORDER BY
    LA.[Date],
    LA.[Time] ASC
`;
// AND CA.Bool8 = 1        PORTAL IS JA

// Routegegevens ophalen van de specifiek geselecteerde leg.
export const selectedRouteQuery = `
  SELECT TOP (1)
    LA.Address_ZIPcode AS loadZip,
    LA.Address_CountryCode AS loadCountry,
    UA.Address_ZIPcode AS unloadZip,
    UA.Address_CountryCode AS unloadCountry

  FROM SO_Leg S

  LEFT JOIN SO_Activity LA
    ON S.BeginActivity = LA.Activitynr

  LEFT JOIN SO_Activity UA
    ON S.EndActivity = UA.Activitynr

  WHERE
    S.GUID = @id
    AND S.Planned IS NULL
    AND S.Invoiced IS NULL
    AND LA.[Date] >= CAST(GETDATE() AS DATE)
    AND S.PlanGroup = 8
`;

// Historische ritten van vervoerders zoeken.
export const query2 = `
  SELECT DISTINCT
    tri.LoadingMeter AS ldm,
    tri.Income AS income,
    tri.Costs AS costs,
    tri.Income - tri.Costs AS result,
    tri.BeginDate AS date,

    rel.Name AS carrier,

    ba.Address_ZIPcode AS loadZip,
    ba.Address_CountryCode AS loadCountry,
    ba.Address_Cityname AS loadCity,

    ea.Address_ZIPcode AS unloadZip,
    ea.Address_CountryCode AS unloadCountry,
    ea.Address_Cityname AS unloadCity,

    rea.Email AS email,
    rea.Phonenr AS phone

  FROM RP_Trip tri

  LEFT JOIN RP_TripActivity bta
    ON tri.BeginTripActivity = bta.TripActivitynr

  LEFT JOIN RP_TripActivity eta
    ON tri.EndTripActivity = eta.TripActivitynr

  LEFT JOIN SO_Activity ba
    ON bta.Activity = ba.Activitynr

  LEFT JOIN SO_Activity ea
    ON eta.Activity = ea.Activitynr

  LEFT JOIN RP_CombinationCosts rcc
    ON tri.Tripnr = rcc.Trip

  LEFT JOIN RM_Relation rel
    ON rcc.Creditor = rel.Relationnr

  LEFT JOIN RM_Address rea
    ON rel.Relationnr = rea.Relation

WHERE
    ba.Address_ZIPcode LIKE @loadZip
    AND ba.Address_CountryCode = @loadCountry
    AND ea.Address_ZIPcode LIKE @unloadZip
    AND ea.Address_CountryCode = @unloadCountry
    AND tri.BeginDate >= DATEFROMPARTS(YEAR(GETDATE()), 1, 1)
    AND tri.BeginDate < DATEFROMPARTS(YEAR(GETDATE()) + 1, 1, 1)

  ORDER BY
    tri.BeginDate DESC
`;
