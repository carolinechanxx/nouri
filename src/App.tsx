import { Navigate, Route, Routes } from 'react-router-dom'
import { useUser } from './context/UserContext'
import { ChatScreen } from './screens/ChatScreen'
import { CheckInScreen } from './screens/CheckInScreen'
import { Day7ReportScreen } from './screens/Day7ReportScreen'
import { DomainRecommendationsScreen } from './screens/DomainRecommendationsScreen'
import { ExperimentScreen } from './screens/ExperimentScreen'
import { FeedScreen } from './screens/FeedScreen'
import { HealthProfileScreen } from './screens/HealthProfileScreen'
import { HomeScreen } from './screens/HomeScreen'
import { InsightScreen } from './screens/InsightScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { SquadScreen } from './screens/SquadScreen'

export default function App() {
  const { onboardingComplete } = useUser()

  return (
    <Routes>
      <Route path="/" element={<Navigate to={onboardingComplete ? '/home' : '/onboarding'} replace />} />
      <Route path="/onboarding" element={<OnboardingScreen />} />
      <Route path="/health-profile" element={<HealthProfileScreen />} />
      <Route path="/home" element={<HomeScreen />} />
      <Route path="/feed" element={<FeedScreen />} />
      <Route path="/experiment" element={<ExperimentScreen />} />
      <Route path="/experiment/domain/:domain" element={<DomainRecommendationsScreen />} />
      <Route path="/checkin" element={<CheckInScreen />} />
      <Route path="/insight" element={<InsightScreen />} />
      <Route path="/chat" element={<ChatScreen />} />
      <Route path="/report" element={<Day7ReportScreen />} />
      <Route path="/profile" element={<ProfileScreen />} />
      <Route path="/squad" element={<SquadScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
