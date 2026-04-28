const expectedTypes = {
  SENTENCING: [
    {
      type: 'HMCTS_WARRANT',
      name: 'Sentencing warrant',
      uploadLinkSegment: 'warrant',
    },
    {
      type: 'TRIAL_RECORD_SHEET',
      name: 'Trial record sheet',
      uploadLinkSegment: 'trial-record-sheet',
    },
    {
      type: 'INDICTMENT',
      name: 'Indictment',
      uploadLinkSegment: 'indictment',
    },
    {
      type: 'PRISON_COURT_REGISTER',
      name: 'Prison court register',
      uploadLinkSegment: 'prison-court-register',
    },
  ],
  NON_SENTENCING: [
    {
      type: 'HMCTS_WARRANT',
      name: 'Remand warrant',
      uploadLinkSegment: 'warrant',
    },
    {
      type: 'PRISON_COURT_REGISTER',
      name: 'Prison court register',
      uploadLinkSegment: 'prison-court-register',
    },
    {
      type: 'BAIL_ORDER',
      name: 'Bail order',
      uploadLinkSegment: 'bail-order',
    },
    {
      type: 'SUSPENDED_IMPRISONMENT_ORDER',
      name: 'Suspended imprisonment order',
      uploadLinkSegment: 'suspended-imprisonment-order',
    },
    {
      type: 'NOTICE_OF_DISCONTINUANCE',
      name: 'Notice of discontinuance',
      uploadLinkSegment: 'notice-of-discontinuance',
    },
    {
      type: 'COMMUNITY_ORDER',
      name: 'Community order',
      uploadLinkSegment: 'community-order',
    },
  ],
}

export default expectedTypes
