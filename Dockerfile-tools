FROM ibmcom/ibmnode

ADD . /app

ENV NODE_ENV production
ENV PORT 3000

EXPOSE 3000

WORKDIR "/app"

RUN npm install
CMD ["/bin/bash"]

ARG bx_dev_user=root
ARG bx_dev_userid=1000

RUN BX_DEV_USER=$bx_dev_user
RUN BX_DEV_USERID=$bx_dev_userid
RUN if [ "$bx_dev_user" != root ]; then useradd -ms /bin/bash -u $bx_dev_userid $bx_dev_user; fi
