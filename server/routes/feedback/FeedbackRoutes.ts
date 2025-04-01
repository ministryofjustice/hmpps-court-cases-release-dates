import { RequestHandler } from 'express'

export default class FeedbackRoutes {
  constructor() {
    // intentionally left blank
  }

  public getFeedback: RequestHandler = async (req, res) => {
    return res.render('pages/feedback/index', { errorMessage: null })
  }

  public postFeedback: RequestHandler = async (req, res) => {
    if (!req.body.feedback) {
      return res.render('pages/feedback/index', {
        errorMessage: {
          text: 'Select which service you are providing feedback for',
        },
      })
    }
    if (req.body.feedback === 'crds') {
      return res.redirect('https://www.smartsurvey.co.uk/s/calculatereleasedates/')
    }
    if (req.body.feedback === 'adjustments') {
      return res.redirect('https://www.smartsurvey.co.uk/s/Adjustments-Helpusbuildbetterservices/')
    }
    return res.redirect('/feedback')
  }
}
