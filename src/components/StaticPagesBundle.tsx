import { memo } from 'react';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import Help from '@/pages/Help';
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';
import Cookies from '@/pages/Cookies';
import LGPD from '@/pages/LGPD';
import HowItWorks from '@/pages/HowItWorks';
import Careers from '@/pages/Careers';
import Press from '@/pages/Press';
import Blog from '@/pages/Blog';
import ReportProblem from '@/pages/ReportProblem';
import TalkToUs from '@/pages/TalkToUs';
import SystemStatus from '@/pages/SystemStatus';
import WorkflowAnalysis from '@/pages/WorkflowAnalysis';
import SearchResults from '@/pages/SearchResults';
import NotFound from '@/pages/NotFound';

interface StaticPagesBundleProps {
  page: string;
}

const StaticPagesBundle = memo(({ page }: StaticPagesBundleProps) => {
  switch (page) {
    case 'about': return <About />;
    case 'contact': return <Contact />;
    case 'help': return <Help />;
    case 'terms': return <Terms />;
    case 'privacy': return <Privacy />;
    case 'cookies': return <Cookies />;
    case 'lgpd': return <LGPD />;
    case 'how-it-works': return <HowItWorks />;
    case 'careers': return <Careers />;
    case 'press': return <Press />;
    case 'blog': return <Blog />;
    case 'report-problem': return <ReportProblem />;
    case 'talk-to-us': return <TalkToUs />;
    case 'system-status': return <SystemStatus />;
    case 'workflow-analysis': return <WorkflowAnalysis />;
    case 'search': return <SearchResults />;
    case 'not-found':
    default: 
      return <NotFound />;
  }
});

StaticPagesBundle.displayName = 'StaticPagesBundle';

export default StaticPagesBundle;