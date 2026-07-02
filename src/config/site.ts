 
 
export const siteConfig = {
  name: 'Pratima ERP',
  description: 'Enterprise Resource Planning for Studio and Photography Businesses',
  links: {
    github: 'https://github.com/pratima-erp',
  },
  roles: {
    SUPER_ADMIN: 'SUPER_ADMIN',
    BRANCH_ADMIN: 'BRANCH_ADMIN',
    SALES_EXEC: 'SALES_EXEC',
    PHOTOGRAPHER: 'PHOTOGRAPHER',
    VIDEOGRAPHER: 'VIDEOGRAPHER',
    DRONE_PILOT: 'DRONE_PILOT',
    EDITOR: 'EDITOR',
    ALBUM_DESIGNER: 'ALBUM_DESIGNER',
    GRAPHIC_DESIGNER: 'GRAPHIC_DESIGNER',
    ACCOUNTANT: 'ACCOUNTANT',
    FREELANCER: 'FREELANCER',
    CLIENT: 'CLIENT',
  },
};

export type SiteConfig = typeof siteConfig;
