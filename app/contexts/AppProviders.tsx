
import React from 'react';
import { ThemeProvider } from './ThemeContext';
import { ToastProvider } from './ToastContext';
import { AuthProvider } from './AuthContext';
import { GmailProvider } from './GmailContext';
import { DriveProvider } from './DriveContext';
import { GoogleCalendarProvider } from './GoogleCalendarContext';
import { BrandProvider } from './BrandContext';
import { CompetitorProvider } from './CompetitorContext';
import { CompetitorLandscapeProvider } from './CompetitorLandscapeContext';
import { AIToolsProvider } from './AIToolsContext';
import { PortfolioProvider } from './PortfolioContext';
import { DashboardProvider } from './DashboardContext';
import { PPCProvider } from './PPCContext';
import { OrderProvider } from './OrderContext';
import { ChatProvider } from './ChatContext';
import { NavigationProvider } from './NavigationContext';
import { CrmProvider } from './CrmContext';
import { FinanceProvider } from './FinanceContext';
import { InventoryProvider } from './InventoryContext';
import { TeamProvider } from './TeamContext';
import { AnalyticsProvider } from './AnalyticsContext';
import { ActionQueueProvider } from './ActionQueueContext';
import { ContentProvider } from './ContentContext';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <NavigationProvider>
            <ChatProvider>
              <CrmProvider>
                <FinanceProvider>
                  <InventoryProvider>
                    <TeamProvider>
                      <AnalyticsProvider>
                        <ActionQueueProvider>
                          <ContentProvider>
                            <GmailProvider>
                              <DriveProvider>
                                <GoogleCalendarProvider>
                                  <BrandProvider>
                                    <CompetitorProvider>
                                      <CompetitorLandscapeProvider>
                                        <AIToolsProvider>
                                          <PortfolioProvider>
                                            <DashboardProvider>
                                              <PPCProvider>
                                                <OrderProvider>
                                                  {children}
                                                </OrderProvider>
                                              </PPCProvider>
                                            </DashboardProvider>
                                          </PortfolioProvider>
                                        </AIToolsProvider>
                                      </CompetitorLandscapeProvider>
                                    </CompetitorProvider>
                                  </BrandProvider>
                                </GoogleCalendarProvider>
                              </DriveProvider>
                            </GmailProvider>
                          </ContentProvider>
                        </ActionQueueProvider>
                      </AnalyticsProvider>
                    </TeamProvider>
                  </InventoryProvider>
                </FinanceProvider>
              </CrmProvider>
            </ChatProvider>
          </NavigationProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};
