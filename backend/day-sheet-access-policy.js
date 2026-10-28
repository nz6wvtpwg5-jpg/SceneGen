function isRestrictedTeamRole(role) {
  return ['band_member', 'crew_member'].includes(role);
}

function mergePortalGrant(current, incoming) {
  if (!current) return incoming;
  const restrictedRole = [current.grant_access_role, incoming.grant_access_role].find(isRestrictedTeamRole);
  if (restrictedRole) {
    current.grant_access_role = restrictedRole;
    current.grant_access_level = 'viewer';
    current.grant_financial_access = 'hidden';
    return current;
  }
  if (incoming.grant_access_level === 'editor') current.grant_access_level = 'editor';
  if (incoming.grant_financial_access === 'edit'
    || (incoming.grant_financial_access === 'view' && current.grant_financial_access === 'hidden')) {
    current.grant_financial_access = incoming.grant_financial_access;
  }
  return current;
}

module.exports = { isRestrictedTeamRole, mergePortalGrant };
